import asyncio
import logging
import os
import uuid
import time
import json
from typing import Dict, List, Any, Optional, TypedDict
from datetime import datetime

import openai
import httpx
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver

from models import Detection, VoiceProcessingResponse
from supabase_client import SupabaseClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Also add print statements as backup
def debug_print(message: str):
    """Print debug message both to logger and stdout"""
    logger.info(message)
    print(f"[DEBUG] {message}")
    
debug_print("VoiceAgent module loading...")


class AgentState(TypedDict):
    """State for the LangGraph agent"""
    messages: List[Dict[str, Any]]
    user_input: str
    project_id: str
    intent: Optional[Dict[str, Any]]
    schema: Optional[Dict[str, Any]]
    plan: Optional[Dict[str, Any]]
    rows_pending: Optional[List[Dict[str, Any]]]
    commit_ids: Optional[List[str]]
    tool_events: Optional[List[Dict[str, Any]]]
    thinking: Optional[str]
    transcription: Optional[str]
    image_url: Optional[str]
    detections: Optional[List[Detection]]
    audio_file_path: Optional[str]

class VoiceAgent:
    def __init__(self, supabase_client: SupabaseClient):
        self.supabase_client = supabase_client
        self.openai_client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.llm = ChatOpenAI(model="gpt-4o", temperature=0)
        self.replicate_token = os.getenv("REPLICATE_API_TOKEN")
        self.yolo_version = os.getenv("YOLO_VERSION", "yolov8n")
        self.yolo_confidence = float(os.getenv("YOLO_CONFIDENCE", "0.25"))
        
        # Create tools FIRST
        self.tools = self._create_tools()
        
        # Bind tools to LLM
        self.llm_with_tools = self.llm.bind_tools(self.tools)
        
        # Create tool node for LangGraph
        self.tool_node = ToolNode(self.tools)
        
        # Initialize the LangGraph workflow
        self.workflow = self._create_workflow()

    def _create_tools(self):
        """Create tools for the LangGraph agent"""
        
        # Use the agent instance in tool functions
        agent_instance = self
        
        @tool
        async def introspect_schema(project_id: str = None) -> Dict[str, Any]:
            """Return database schema for the project"""
            try:
                if project_id:
                    schema = await agent_instance.supabase_client.get_project_schema(project_id)
                    return schema.dict()
                else:
                    # Return hardcoded schema for demo
                    return {
                        "table": "samples",
                        "columns": {
                            "id": "uuid",
                            "class": "text",
                            "weight": "float",
                            "image_url": "text",
                            "project_id": "uuid",
                            "created_at": "timestamptz"
                        },
                        "primary_key": "id"
                    }
            except Exception as e:
                logger.error(f"Error introspecting schema: {e}")
                return {"error": str(e)}

        @tool
        async def sample_rows(project_id: str, n: int = 5) -> List[Dict[str, Any]]:
            """Return data samples from the database for few-shot learning"""
            try:
                records = await agent_instance.supabase_client.get_sample_rows(project_id, limit=n)
                return records
            except Exception as e:
                logger.error(f"Error sampling rows: {e}")
                return []

        @tool
        async def vision_label(image_url: str, project_id: str, n_fewshot: int = 6) -> List[Dict[str, Any]]:
            """Detect and classify objects in an image using YOLO + GPT-4o"""
            try:
                logger.info(f"Vision tool called with image_url: {image_url}, project_id: {project_id}")
                
                # Validate inputs
                if not image_url or not project_id:
                    logger.error("Missing required parameters for vision_label")
                    return []
                
                detections = await agent_instance.vision_detect_label(image_url, project_id, n_fewshot)
                logger.info(f"Vision detection completed with {len(detections)} results")
                return [detection.dict() for detection in detections]
            except Exception as e:
                logger.error(f"Error in vision labeling: {e}")
                return []

        @tool
        async def write_rows(rows: List[Dict[str, Any]], project_id: str) -> Dict[str, Any]:
            """Commit multiple samples/rows to database with audit trail"""
            try:
                result = await agent_instance.supabase_client.write_batch_records(project_id, rows)
                return result
            except Exception as e:
                logger.error(f"Error writing rows: {e}")
                return {"error": str(e)}

        @tool
        async def ask_photo() -> Dict[str, str]:
            """Prompt user to take a photo"""
            return {"prompt": "Please photograph the artifacts or site.", "action": "camera"}

        @tool
        async def user_audio(prompt: str) -> Dict[str, str]:
            """Prompt user to record audio"""
            return {"prompt": prompt, "action": "audio"}

        @tool
        async def user_info(prompt: str) -> Dict[str, str]:
            """Prompt user for information"""
            return {"prompt": prompt, "action": "input"}

        return [introspect_schema, sample_rows, vision_label, write_rows, ask_photo, user_audio, user_info]

    def _create_workflow(self) -> StateGraph:
        """Create the LangGraph workflow with proper tool integration"""
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node("intent_parser", self._intent_node)
        workflow.add_node("planner", self._planner_node)
        workflow.add_node("executor", self._executor_node)
        workflow.add_node("tools", self.tool_node)  # Add the tool node
        workflow.add_node("writer", self._writer_node)
        
        # Define edges with conditional routing
        workflow.add_edge(START, "intent_parser")
        workflow.add_edge("intent_parser", "planner")
        workflow.add_conditional_edges(
            "planner",
            self._should_use_tools,
            {
                "tools": "tools",
                "executor": "executor"
            }
        )
        workflow.add_edge("tools", "executor")
        workflow.add_edge("executor", "writer")
        workflow.add_edge("writer", END)
        
        # Add memory for conversation state
        memory = MemorySaver()
        return workflow.compile(checkpointer=memory)

    def _should_use_tools(self, state: AgentState) -> str:
        """Determine if tools should be used based on the plan"""
        debug_print("🤔 ROUTING: ========== ENTERING ROUTING DECISION ==========")
        
        plan = state.get("plan", {})
        intent = state.get("intent", {})
        messages = state.get("messages", [])
        
        debug_print(f"🤔 ROUTING: Intent task_type: {intent.get('task_type')}")
        debug_print(f"🤔 ROUTING: Plan task_type: {plan.get('task_type')}")
        debug_print(f"🤔 ROUTING: Plan status: {plan.get('status')}")
        debug_print(f"🤔 ROUTING: Messages count: {len(messages)}")
        debug_print(f"🤔 ROUTING: Latest message role: {messages[-1].get('role') if messages else 'None'}")
        debug_print(f"🤔 ROUTING: Has tool_calls in messages: {bool(messages and messages[-1].get('tool_calls'))}")
        
        # Check if we have tool calls in messages (this should be the primary check)
        if messages and messages[-1].get("tool_calls"):
            debug_print("🤔 ROUTING: Found tool calls in messages, routing to tools")
            debug_print("🤔 ROUTING: ========== ROUTING TO TOOLS ==========")
            return "tools"
        
        # Use tools for schema introspection or data operations
        if intent.get("task_type") in ["explain_database", "query_data"]:
            debug_print("🤔 ROUTING: Task requires tools but no tool_calls found - this indicates a planner issue")
            debug_print("🤔 ROUTING: ========== ROUTING TO EXECUTOR (FALLBACK) ==========")
            return "executor"
        
        # For image classification, we need the image first
        if intent.get("task_type") == "record_artifacts" and not state.get("image_url"):
            debug_print("🤔 ROUTING: Need image for classification, skipping tools for now")
            debug_print("🤔 ROUTING: ========== ROUTING TO EXECUTOR ==========")
            return "executor"
        
        # Check plan status
        plan_status = plan.get("status", "")
        if plan_status == "ready_for_analysis":
            debug_print("🤔 ROUTING: Plan ready for analysis - using tools")
            debug_print("🤔 ROUTING: ========== ROUTING TO TOOLS ==========")
            return "tools"
        
        debug_print("🤔 ROUTING: Default routing to executor")
        debug_print("🤔 ROUTING: ========== ROUTING TO EXECUTOR ==========")
        return "executor"

    async def _intent_node(self, state: AgentState) -> AgentState:
        """Parse user intent from the transcribed message with improved prompting"""
        debug_print("🎯 INTENT NODE: ========== ENTERING INTENT NODE ==========")
        debug_print(f"🎯 INTENT NODE: Input state keys: {list(state.keys())}")
        
        try:
            user_msg = state["messages"][-1]["content"] if state["messages"] else state.get("user_input", "")
            debug_print(f"🎯 INTENT NODE: Processing message: '{user_msg}'")
            
            # Enhanced system prompt for better intent recognition
            sys_prompt = """You are an archaeological data collection assistant that parses user intents.
            
            Analyze the user's voice command and extract their intent as structured JSON.
            
            Task Types:
            - "record_artifacts": User wants to record/catalog artifacts (bag dumps, single items, etc.)
            - "update_data": User wants to modify existing records
            - "query_data": User wants to search or retrieve information
            - "explain_database": User asks about database structure, schema, or "what can I record"
            - "analysis": User wants data analysis or reports
            
            Domains (what type of artifacts/data):
            - "pottery": Pottery sherds, ceramics, vessels
            - "lithics": Stone tools, flakes, cores
            - "features": Hearths, post holes, structures
            - "bones": Faunal remains, bones
            - "general": Mixed artifacts or unspecified
            - "database": Questions about the database itself
            
            Actions (specific operations):
            - "bag_dump": Processing multiple artifacts from a bag/unit
            - "single_record": Recording one specific artifact
            - "batch_entry": Multiple individual entries
            - "describe_schema": Explain database structure
            - "search_records": Find existing data
            
            Examples:
            "Tell me about the database" → task_type: "explain_database", domain: "database"
            "What can I record?" → task_type: "explain_database", domain: "database"
            "I have a bag of pottery sherds" → task_type: "record_artifacts", domain: "pottery", action: "bag_dump"
            "Record this lithic" → task_type: "record_artifacts", domain: "lithics", action: "single_record"
            
            Return only valid JSON with these exact fields:
            {
                "task_type": "one of the task types above",
                "domain": "one of the domains above", 
                "action": "one of the actions above",
                "entities": ["list", "of", "mentioned", "artifacts", "or", "terms"],
                "confidence": 0.85
            }"""
            
            messages = [
                SystemMessage(content=sys_prompt),
                HumanMessage(content=f"Parse this user input: '{user_msg}'")
            ]
            
            debug_print("🎯 INTENT NODE: Calling LLM for intent parsing...")
            response = await self.llm.ainvoke(messages)
            debug_print(f"🎯 INTENT NODE: LLM response: {response.content[:200]}...")
            
            try:
                # Try to extract JSON from the response
                content = response.content.strip()
                debug_print(f"🎯 INTENT NODE: Attempting to parse JSON from: {content[:100]}...")
                
                if content.startswith("```json"):
                    content = content.split("```json")[1].split("```")[0].strip()
                elif content.startswith("```"):
                    content = content.split("```")[1].split("```")[0].strip()
                
                intent = json.loads(content)
                
                # Validate required fields
                required_fields = ["task_type", "domain", "action"]
                for field in required_fields:
                    if field not in intent:
                        raise ValueError(f"Missing required field: {field}")
                
                debug_print(f"🎯 INTENT NODE: Successfully parsed intent: {intent}")
                
            except (json.JSONDecodeError, ValueError) as e:
                debug_print(f"🎯 INTENT NODE: Failed to parse intent JSON: {e}, falling back to heuristics")
                
                # Improved fallback with keyword matching
                user_lower = user_msg.lower()
                debug_print(f"🎯 INTENT NODE: Using fallback parsing for: '{user_lower}'")
                
                # Determine task type
                if any(word in user_lower for word in ["database", "schema", "structure", "what can", "tell me about"]):
                    task_type = "explain_database"
                    domain = "database"
                    action = "describe_schema"
                    debug_print(f"🎯 INTENT NODE: Detected database query keywords")
                elif any(word in user_lower for word in ["bag", "dump", "multiple", "bunch of"]):
                    task_type = "record_artifacts"
                    action = "bag_dump"
                    debug_print(f"🎯 INTENT NODE: Detected bag dump keywords")
                else:
                    task_type = "record_artifacts"
                    action = "single_record"
                    debug_print(f"🎯 INTENT NODE: Defaulting to single record")
                
                # Determine domain if not database
                if task_type != "explain_database":
                    if any(word in user_lower for word in ["pottery", "ceramic", "sherd", "vessel"]):
                        domain = "pottery"
                    elif any(word in user_lower for word in ["lithic", "stone", "flake", "tool"]):
                        domain = "lithics"
                    elif any(word in user_lower for word in ["bone", "faunal"]):
                        domain = "bones"
                    elif any(word in user_lower for word in ["feature", "hearth", "post"]):
                        domain = "features"
                    else:
                        domain = "general"
                    
                    debug_print(f"🎯 INTENT NODE: Determined domain: {domain}")
                
                intent = {
                    "task_type": task_type,
                    "domain": domain,
                    "action": action,
                    "entities": user_msg.split()[:3],  # First few words as entities
                    "confidence": 0.6  # Lower confidence for fallback
                }
                
                debug_print(f"🎯 INTENT NODE: Used fallback intent: {intent}")
            
            result_state = {
                **state,
                "intent": intent,
                "thinking": f"Parsed intent with {intent.get('confidence', 0.6):.2f} confidence"
            }
            
            debug_print(f"🎯 INTENT NODE: Completed successfully. Intent: {intent['task_type']}/{intent['domain']}")
            debug_print("🎯 INTENT NODE: ========== EXITING INTENT NODE ==========")
            return result_state
            
        except Exception as e:
            debug_print(f"🎯 INTENT NODE: ERROR - {e}")
            # Final fallback
            fallback_intent = {
                "task_type": "record_artifacts",
                "domain": "general",
                "action": "single_record",
                "entities": [],
                "confidence": 0.3
            }
            debug_print(f"🎯 INTENT NODE: Using final fallback: {fallback_intent}")
            debug_print("🎯 INTENT NODE: ========== EXITING INTENT NODE (ERROR) ==========")
            return {
                **state,
                "intent": fallback_intent,
                "thinking": f"Intent parsing failed, using fallback: {e}"
            }

    async def _planner_node(self, state: AgentState) -> AgentState:
        """Create a workflow plan based on intent and schema"""
        logger.info("📋 PLANNER NODE: Starting workflow planning")
        logger.info(f"📋 PLANNER NODE: Input state keys: {list(state.keys())}")
        
        try:
            intent = state.get("intent", {})
            project_id = state.get("project_id")
            
            logger.info(f"📋 PLANNER NODE: Intent received: {intent}")
            logger.info(f"📋 PLANNER NODE: Project ID: {project_id}")
            
            # Handle database explanation requests directly
            if intent.get("task_type") == "explain_database":
                logger.info("📋 PLANNER NODE: Creating database explanation plan")
                
                # Add tool call message for schema introspection
                tool_call_message = {
                    "role": "assistant",
                    "content": "",
                    "tool_calls": [
                        {
                            "id": "call_schema",
                            "type": "function",
                            "function": {
                                "name": "introspect_schema",
                                "arguments": json.dumps({"project_id": project_id})
                            }
                        }
                    ]
                }
                
                updated_messages = state.get("messages", []) + [tool_call_message]
                logger.info(f"📋 PLANNER NODE: Added tool call message. Total messages: {len(updated_messages)}")
                
                result_state = {
                    **state,
                    "messages": updated_messages,
                    "plan": {
                        "description": "Explain database schema and structure",
                        "steps": [
                            {"type": "schema_explanation", "requires_tools": True}
                        ],
                        "estimated_time": 1,
                        "requires_user_input": False,
                        "task_type": "explain_database"
                    },
                    "thinking": "User wants database explanation. Will use introspect_schema tool."
                }
                
                logger.info("📋 PLANNER NODE: Database explanation plan created successfully")
                return result_state
            
            # For artifact classification requests - WAIT FOR IMAGE
            if intent.get("task_type") == "record_artifacts":
                domain = intent.get("domain", "general")
                action = intent.get("action", "single_record")
                
                logger.info(f"📋 PLANNER NODE: Creating artifact recording plan - Domain: {domain}, Action: {action}")
                
                # Check if we have an image URL in state
                has_image = state.get("image_url") is not None
                logger.info(f"📋 PLANNER NODE: Has image: {has_image}")
                
                if not has_image:
                    # Plan to request image first
                    plan = {
                        "description": f"Request photo for {domain} classification",
                        "steps": [
                            {"type": "request_photo", "prompt": f"Please take a photo of the {domain} artifacts you want to classify."},
                            {"type": "wait_for_image", "description": "Waiting for user to provide image"}
                        ],
                        "estimated_time": 2,
                        "requires_user_input": True,
                        "status": "waiting_for_image",
                        "task_type": "record_artifacts"
                    }
                    
                    logger.info(f"📋 PLANNER NODE: No image provided yet, created photo request plan")
                    
                else:
                    # We have an image, plan to analyze it
                    plan = {
                        "description": f"Analyze {domain} artifacts in provided image",
                        "steps": [
                            {"type": "vision_analysis", "requires_tools": True},
                            {"type": "data_extraction", "requires_tools": True}
                        ],
                        "estimated_time": 3,
                        "requires_user_input": False,
                        "status": "ready_for_analysis",
                        "task_type": "record_artifacts"
                    }
                    
                    logger.info(f"📋 PLANNER NODE: Image available, created analysis plan")
            
            else:
                # Default plan for other intents
                logger.info(f"📋 PLANNER NODE: Creating default plan for task_type: {intent.get('task_type')}")
                plan = {
                    "description": "Process user request",
                    "steps": [
                        {"type": "general_processing"}
                    ],
                    "estimated_time": 1,
                    "requires_user_input": False,
                    "task_type": intent.get("task_type", "unknown")
                }
            
            result_state = {
                **state,
                "plan": plan,
                "thinking": f"Created plan for {intent.get('task_type')}: {plan['description']}"
            }
            
            logger.info(f"📋 PLANNER NODE: Plan created successfully: {plan['description']}")
            return result_state
            
        except Exception as e:
            logger.error(f"📋 PLANNER NODE: ERROR - {e}", exc_info=True)
            # Simple fallback plan that doesn't trigger unwanted tool calls
            default_plan = {
                "description": "Unable to create specific plan",
                "steps": [
                    {"type": "error_response", "message": f"Planning failed: {e}"}
                ],
                "estimated_time": 1,
                "requires_user_input": False,
                "task_type": "error"
            }
            logger.info(f"📋 PLANNER NODE: Using error fallback plan")
            return {
                **state,
                "plan": default_plan,
                "thinking": f"Planning failed, using safe fallback: {e}"
            }

    async def _executor_node(self, state: AgentState) -> AgentState:
        """Execute the planned workflow steps"""
        debug_print("⚡ EXECUTOR NODE: ========== ENTERING EXECUTOR NODE ==========")
        debug_print(f"⚡ EXECUTOR NODE: Input state keys: {list(state.keys())}")
        
        try:
            plan = state.get("plan", {})
            project_id = state.get("project_id")
            intent = state.get("intent", {})
            
            debug_print(f"⚡ EXECUTOR NODE: Plan description: {plan.get('description', 'No description')}")
            debug_print(f"⚡ EXECUTOR NODE: Plan status: {plan.get('status', 'No status')}")
            debug_print(f"⚡ EXECUTOR NODE: Intent task_type: {intent.get('task_type')}")
            
            rows_pending = []
            tool_events = []
            
            # Check if we have tool call results from the tools node
            messages = state.get("messages", [])
            latest_message = messages[-1] if messages else None
            
            debug_print(f"⚡ EXECUTOR NODE: Latest message role: {latest_message.get('role') if latest_message else 'None'}")
            debug_print(f"⚡ EXECUTOR NODE: Total messages: {len(messages)}")
            
            # Process tool results if available
            if latest_message and latest_message.get("role") == "tool":
                tool_name = latest_message.get("name", "")
                tool_content = latest_message.get("content", "")
                
                debug_print(f"⚡ EXECUTOR NODE: Processing tool result from {tool_name}")
                debug_print(f"⚡ EXECUTOR NODE: Tool content preview: {str(tool_content)[:100]}...")
                
                if tool_name == "introspect_schema":
                    debug_print("⚡ EXECUTOR NODE: Processing schema introspection result")
                    try:
                        schema = json.loads(tool_content) if isinstance(tool_content, str) else tool_content
                        explanation = self._generate_schema_explanation(schema)
                        tool_events.append({
                            "schema_explanation": {
                                "explanation": explanation,
                                "schema": schema
                            }
                        })
                        debug_print("⚡ EXECUTOR NODE: Generated schema explanation successfully")
                    except Exception as e:
                        debug_print(f"⚡ EXECUTOR NODE: Error processing schema result: {e}")
                        tool_events.append({"error": f"Failed to process schema: {e}"})
                
                elif tool_name == "sample_rows":
                    debug_print("⚡ EXECUTOR NODE: Processing sample rows result")
                    try:
                        sample_data = json.loads(tool_content) if isinstance(tool_content, str) else tool_content
                        debug_print(f"⚡ EXECUTOR NODE: Received {len(sample_data) if isinstance(sample_data, list) else 0} sample rows")
                        
                        # Create a summary of the sample data
                        summary = f"Found {len(sample_data) if isinstance(sample_data, list) else 0} sample records"
                        if isinstance(sample_data, list) and len(sample_data) > 0:
                            # Extract field names from first record
                            first_record = sample_data[0]
                            if isinstance(first_record, dict):
                                fields = list(first_record.keys())
                                summary += f" with fields: {', '.join(fields[:5])}"  # Show first 5 fields
                        
                        tool_events.append({
                            "data_query_result": {
                                "summary": summary,
                                "sample_count": len(sample_data) if isinstance(sample_data, list) else 0,
                                "sample_data": sample_data
                            }
                        })
                        debug_print("⚡ EXECUTOR NODE: Processed sample rows successfully")
                    except Exception as e:
                        debug_print(f"⚡ EXECUTOR NODE: Error processing sample rows: {e}")
                        tool_events.append({"error": f"Failed to process sample rows: {e}"})
                    debug_print("⚡ EXECUTOR NODE: Processing vision detection result")
                    try:
                        detections = json.loads(tool_content) if isinstance(tool_content, str) else tool_content
                        debug_print(f"⚡ EXECUTOR NODE: Processing {len(detections)} vision detections")
                        
                        for detection in detections:
                            record = {
                                "id": str(uuid.uuid4()),
                                "class": detection.get("label", "unknown"),
                                "confidence": detection.get("confidence", 0.0),
                                "bbox": detection.get("bbox", []),
                                "table_name": "samples"
                            }
                            rows_pending.append(record)
                            debug_print(f"⚡ EXECUTOR NODE: Created record for detection: {detection.get('label')}")
                        
                        tool_events.append({
                            "vision_detect_label": {
                                "detections": detections,
                                "count": len(detections)
                            }
                        })
                        debug_print(f"⚡ EXECUTOR NODE: Created {len(rows_pending)} pending records from vision")
                    except Exception as e:
                        debug_print(f"⚡ EXECUTOR NODE: Error processing vision results: {e}")
                        tool_events.append({"error": f"Failed to process vision results: {e}"})
                
                else:
                    debug_print(f"⚡ EXECUTOR NODE: Unknown tool result: {tool_name}")
                
                result_state = {
                    **state,
                    "rows_pending": rows_pending,
                    "tool_events": tool_events,
                    "thinking": f"Processed tool results from {tool_name}"
                }
                
                debug_print(f"⚡ EXECUTOR NODE: Tool processing complete. Events: {len(tool_events)}, Pending: {len(rows_pending)}")
                debug_print("⚡ EXECUTOR NODE: ========== EXITING EXECUTOR NODE (TOOL RESULTS) ==========")
                return result_state
            
            # Handle different plan types when no tool results
            plan_status = plan.get("status", "")
            debug_print(f"⚡ EXECUTOR NODE: No tool results, handling plan status: {plan_status}")
            
            if plan_status == "waiting_for_image":
                debug_print("⚡ EXECUTOR NODE: Plan requires image - requesting photo")
                tool_events.append({
                    "request_photo": {
                        "prompt": "Please take a photo of the artifacts you want to classify.",
                        "action": "camera"
                    }
                })
                
            elif plan_status == "ready_for_analysis" and state.get("image_url"):
                debug_print("⚡ EXECUTOR NODE: Image available but tools weren't called - workflow issue")
                tool_events.append({
                    "warning": "Image available but analysis tools weren't triggered"
                })
                
            else:
                # Execute non-tool steps from plan
                debug_print(f"⚡ EXECUTOR NODE: Executing plan steps: {len(plan.get('steps', []))}")
                for step in plan.get("steps", []):
                    step_type = step.get("type", "")
                    debug_print(f"⚡ EXECUTOR NODE: Processing step type: {step_type}")
                    
                    if step_type == "request_photo":
                        tool_events.append({
                            "request_photo": {
                                "prompt": step.get("prompt", "Please take a photo"),
                                "action": "camera"
                            }
                        })
                        debug_print("⚡ EXECUTOR NODE: Added photo request event")
                        
                    elif step_type == "error_response":
                        tool_events.append({
                            "error_response": {
                                "message": step.get("message", "Unknown error")
                            }
                        })
                        debug_print("⚡ EXECUTOR NODE: Added error response event")
                    
                    elif step_type == "general_processing":
                        tool_events.append({
                            "general_response": {
                                "message": "Processing general request"
                            }
                        })
                        debug_print("⚡ EXECUTOR NODE: Added general processing event")
            
            result_state = {
                **state,
                "rows_pending": rows_pending,
                "tool_events": tool_events,
                "thinking": f"Executed plan steps - Status: {plan_status}, Events: {len(tool_events)}"
            }
            
            debug_print(f"⚡ EXECUTOR NODE: Execution complete. Final events: {len(tool_events)}")
            debug_print("⚡ EXECUTOR NODE: ========== EXITING EXECUTOR NODE ==========")
            return result_state
            
        except Exception as e:
            debug_print(f"⚡ EXECUTOR NODE: ERROR - {e}")
            debug_print("⚡ EXECUTOR NODE: ========== EXITING EXECUTOR NODE (ERROR) ==========")
            return {
                **state,
                "rows_pending": [],
                "tool_events": [{"error": f"Executor error: {str(e)}"}],
                "thinking": f"Error in execution: {e}"
            }

    def _generate_schema_explanation(self, schema: Dict[str, Any]) -> str:
        """Generate a human-readable explanation of the database schema"""
        try:
            if "error" in schema:
                return f"❌ Could not retrieve schema: {schema['error']}"
            
            explanation = "🗄️ **Database Schema Overview**\n\n"
            
            if "table" in schema:
                # Simple schema format
                table_name = schema.get("table", "Unknown")
                columns = schema.get("columns", {})
                
                explanation += f"📋 **Table: {table_name}**\n"
                explanation += "Available fields for recording:\n"
                
                for col_name, col_type in columns.items():
                    explanation += f"  • **{col_name}** ({col_type})\n"
                
            elif "tables" in schema:
                # Complex schema format
                tables = schema.get("tables", [])
                for table in tables:
                    table_name = table.get("name", "Unknown")
                    columns = table.get("columns", [])
                    
                    explanation += f"📋 **Table: {table_name}**\n"
                    for col in columns:
                        col_name = col.get("name", "")
                        col_type = col.get("type", "")
                        required = " ✅ (required)" if col.get("required", False) else " ⚪ (optional)"
                        explanation += f"  • **{col_name}** ({col_type}){required}\n"
                    explanation += "\n"
            
            explanation += "\n🎯 **What you can record:**\n"
            explanation += "  • **Artifact classifications** (pottery, lithics, bones, etc.)\n"
            explanation += "  • **Physical measurements** (weight, dimensions)\n" 
            explanation += "  • **Material properties** (color, material type)\n"
            explanation += "  • **Spatial context** (location, unit, level)\n"
            explanation += "  • **Visual documentation** (photos, sketches)\n"
            explanation += "\n💡 **Tip:** Say 'I have a bag of pottery sherds' to start recording!"
            
            return explanation
            
        except Exception as e:
            logger.error(f"Error generating schema explanation: {e}")
            return f"Error explaining schema: {e}"

    async def _writer_node(self, state: AgentState) -> AgentState:
        """Write pending records to database or handle special responses"""
        debug_print("📝 WRITER NODE: Starting write operations")
        debug_print(f"📝 WRITER NODE: Input state keys: {list(state.keys())}")
        
        try:
            rows_pending = state.get("rows_pending", [])
            tool_events = state.get("tool_events", [])
            project_id = state.get("project_id")
            
            debug_print(f"📝 WRITER NODE: Rows pending: {len(rows_pending)}")
            debug_print(f"📝 WRITER NODE: Tool events: {len(tool_events)}")
            debug_print(f"📝 WRITER NODE: Tool event types: {[list(event.keys()) for event in tool_events]}")
            
            # Handle schema explanation responses
            for event in tool_events:
                if "schema_explanation" in event:
                    explanation = event["schema_explanation"]["explanation"]
                    debug_print("📝 WRITER NODE: Found schema explanation, returning it")
                    
                    result_state = {
                        **state,
                        "commit_ids": [],
                        "extracted_data": {"schema_explanation": True},
                        "confidence": 1.0,
                        "suggested_fields": [],
                        "reasoning": explanation,
                        "message": explanation,
                        "thinking": "Provided database schema explanation"
                    }
                    
                    debug_print("📝 WRITER NODE: Schema explanation response prepared")
                    return result_state
            
            # Handle photo request responses
            for event in tool_events:
                if "request_photo" in event:
                    debug_print("📝 WRITER NODE: Found photo request event")
                    
                    result_state = {
                        **state,
                        "commit_ids": [],
                        "extracted_data": {"photo_requested": True},
                        "confidence": 1.0,
                        "suggested_fields": [],
                        "reasoning": event["request_photo"]["prompt"],
                        "message": event["request_photo"]["prompt"],
                        "thinking": "Requested photo from user"
                    }
                    
                    debug_print("📝 WRITER NODE: Photo request response prepared")
                    return result_state
            
            # Handle general responses
            for event in tool_events:
                if "general_response" in event:
                    debug_print("📝 WRITER NODE: Found general response event")
                    
                    result_state = {
                        **state,
                        "commit_ids": [],
                        "extracted_data": {"general_processing": True},
                        "confidence": 0.8,
                        "suggested_fields": [],
                        "reasoning": event["general_response"]["message"],
                        "message": event["general_response"]["message"],
                        "thinking": "Processed general request"
                    }
                    
                    return result_state
            
            # Handle error responses
            for event in tool_events:
                if "error_response" in event or "error" in event:
                    error_msg = event.get("error_response", {}).get("message") or event.get("error", "Unknown error")
                    debug_print(f"📝 WRITER NODE: Found error event: {error_msg}")
                    
                    result_state = {
                        **state,
                        "commit_ids": [],
                        "extracted_data": {"error": True},
                        "confidence": 0.0,
                        "suggested_fields": [],
                        "reasoning": f"Error: {error_msg}",
                        "message": f"Sorry, there was an error: {error_msg}",
                        "thinking": f"Error occurred: {error_msg}"
                    }
                    
                    return result_state
            
            if not rows_pending:
                debug_print("📝 WRITER NODE: No records to write, returning empty response")
                return {
                    **state,
                    "commit_ids": [],
                    "extracted_data": {"no_records": True},
                    "reasoning": "No data to record",
                    "thinking": "No records to write"
                }
            
            # Write batch records
            debug_print(f"📝 WRITER NODE: Attempting to write {len(rows_pending)} records")
            try:
                result = await self.supabase_client.write_batch_records(project_id, rows_pending)
                debug_print(f"📝 WRITER NODE: Successfully wrote records: {result}")
                
                return {
                    **state,
                    "commit_ids": [result["commit_id"]],
                    "extracted_data": {
                        "records_written": result["records_count"],
                        "commit_id": result["commit_id"]
                    },
                    "confidence": sum(r.get("confidence", 0) for r in rows_pending) / len(rows_pending),
                    "suggested_fields": ["class", "weight", "dimensions", "color", "material"],
                    "thinking": f"Successfully wrote {result['records_count']} records with commit {result['commit_id']}"
                }
            except Exception as write_error:
                debug_print(f"📝 WRITER NODE: Error writing to database: {write_error}")
                return {
                    **state,
                    "commit_ids": [],
                    "extracted_data": {"error": str(write_error)},
                    "thinking": f"Failed to write records: {write_error}"
                }
            
        except Exception as e:
            debug_print(f"📝 WRITER NODE: ERROR - {e}")
            return {
                **state,
                "commit_ids": [],
                "extracted_data": {"error": str(e)},
                "thinking": f"Error in writer node: {e}"
            }

    # Remove the duplicate transcribe_audio method and keep only one version
    async def transcribe_audio(self, audio_file_path: str) -> str:
        """Transcribe audio file using OpenAI Whisper"""
        try:
            with open(audio_file_path, "rb") as audio_file:
                transcript = await self.openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="en"
                )
            return transcript.text
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            return "Transcription failed"

    # Keep the rest of your existing methods (vision_detect_label, etc.) unchanged
    async def vision_detect_label(self, image_url: str, project_id: str, n_fewshot: int = 6, yolo_conf: float = None) -> List[Detection]:
        """Real vision detection using YOLO + GPT-4o classification"""
        try:
            if yolo_conf is None:
                yolo_conf = self.yolo_confidence
            
            # For demo purposes, return simulated detections
            # Replace this with your actual YOLO + GPT-4o implementation
            return await self._simulate_vision_detection(project_id)
            
        except Exception as e:
            logger.error(f"Error in vision detection: {e}")
            return await self._simulate_vision_detection(project_id)

    async def _simulate_vision_detection(self, project_id: str) -> List[Detection]:
        """Simulate vision detection for demo purposes"""
        try:
            sample_rows = await self.supabase_client.get_sample_rows(project_id, limit=5)
        except Exception as e:
            logger.warning(f"Could not fetch sample rows for project {project_id}: {e}")
            sample_rows = []
        
        classes = ["rim", "body", "base", "handle"] if not sample_rows else list(set(
            row.get("class", "unknown") for row in sample_rows
        ))
        
        simulated_detections = [
            {
                "bbox": [0.1, 0.2, 0.3, 0.4],
                "label": classes[0] if classes else "pottery_sherd",
                "confidence": 0.85
            },
            {
                "bbox": [0.5, 0.3, 0.7, 0.6],
                "label": classes[1] if len(classes) > 1 else "pottery_sherd",
                "confidence": 0.78
            }
        ]
        
        return [Detection(**det) for det in simulated_detections]

    async def process_voice_input(self, project_id: str, audio_file_path: str, context: Optional[str] = None) -> VoiceProcessingResponse:
        """Main entry point for processing voice input"""
        workflow_execution_log = []  # Track which nodes are executed
        
        debug_print("🚀 MAIN PROCESS: Starting voice input processing")
        debug_print(f"🚀 MAIN PROCESS: Project ID: {project_id}")
        debug_print(f"🚀 MAIN PROCESS: Audio file: {audio_file_path}")
        
        try:
            # Transcribe audio
            debug_print("🚀 MAIN PROCESS: Starting transcription")
            transcription = await self.transcribe_audio(audio_file_path)
            debug_print(f"🚀 MAIN PROCESS: Transcribed: '{transcription}'")
            workflow_execution_log.append(f"✅ Transcription completed: '{transcription}'")
            
            # Initialize state with proper structure
            initial_state = AgentState(
                messages=[{"role": "user", "content": transcription}],
                user_input=transcription,
                project_id=project_id,
                transcription=transcription,
                intent=None,
                schema=None,
                plan=None,
                rows_pending=None,
                commit_ids=None,
                tool_events=None,
                thinking=None,
                image_url=None,  # This is key - no image URL initially
                detections=None,
                audio_file_path=audio_file_path
            )
            
            # Create a unique thread ID for this conversation
            thread_id = str(uuid.uuid4())
            config = {"configurable": {"thread_id": thread_id}}
            
            debug_print(f"🚀 MAIN PROCESS: Starting workflow with thread_id: {thread_id}")
            debug_print(f"🚀 MAIN PROCESS: Initial state - transcription: '{transcription}', image_url: {initial_state.get('image_url')}")
            workflow_execution_log.append(f"✅ Workflow starting with thread: {thread_id}")
            
            # Create a wrapper to track node execution
            original_workflow = self.workflow
            execution_tracker = {}
            
            # Track node execution by intercepting the workflow
            class WorkflowTracker:
                def __init__(self, original_workflow):
                    self.original_workflow = original_workflow
                    self.execution_order = []
                
                async def ainvoke(self, state, config=None):
                    self.execution_order.append("workflow_started")
                    debug_print("🔄 WORKFLOW: Starting LangGraph execution")
                    workflow_execution_log.append("🔄 LangGraph workflow started")
                    
                    # Call original workflow
                    result = await self.original_workflow.ainvoke(state, config)
                    
                    self.execution_order.append("workflow_completed")
                    debug_print("🔄 WORKFLOW: LangGraph execution completed")
                    workflow_execution_log.append("🔄 LangGraph workflow completed")
                    
                    return result
            
            tracked_workflow = WorkflowTracker(original_workflow)
            
            # Run the workflow
            debug_print("🚀 MAIN PROCESS: Invoking workflow...")
            workflow_execution_log.append("🚀 Invoking LangGraph workflow...")
            
            final_state = await tracked_workflow.ainvoke(initial_state, config=config)
            
            debug_print(f"🚀 MAIN PROCESS: Workflow completed!")
            debug_print(f"🚀 MAIN PROCESS: Final state keys: {list(final_state.keys())}")
            debug_print(f"🚀 MAIN PROCESS: Final thinking: {final_state.get('thinking')}")
            debug_print(f"🚀 MAIN PROCESS: Final intent: {final_state.get('intent')}")
            debug_print(f"🚀 MAIN PROCESS: Final plan: {final_state.get('plan', {}).get('description')}")
            
            workflow_execution_log.append(f"✅ Workflow completed successfully")
            workflow_execution_log.append(f"📋 Final intent: {final_state.get('intent')}")
            workflow_execution_log.append(f"📋 Final plan: {final_state.get('plan', {}).get('description', 'No plan')}")
            
            # Extract results safely
            extracted_data = final_state.get("extracted_data", {})
            tool_events = final_state.get("tool_events", [])
            
            debug_print(f"🚀 MAIN PROCESS: Extracted data keys: {list(extracted_data.keys())}")
            debug_print(f"🚀 MAIN PROCESS: Tool events count: {len(tool_events)}")
            
            # Add comprehensive debugging info including workflow execution
            extracted_data["debug_info"] = {
                "intent": final_state.get("intent"),
                "plan_description": final_state.get("plan", {}).get("description"),
                "tool_events_count": len(tool_events),
                "had_image": bool(final_state.get("image_url")),
                "workflow_completed": True,
                "workflow_execution_log": workflow_execution_log,
                "node_execution_order": tracked_workflow.execution_order,
                "final_state_keys": list(final_state.keys()),
                "messages_count": len(final_state.get("messages", [])),
                "latest_message_role": final_state.get("messages", [{}])[-1].get("role", "none") if final_state.get("messages") else "none"
            }
            
            if final_state.get("rows_pending"):
                extracted_data.update({"pending_records": len(final_state["rows_pending"])})
            
            # Check for schema explanations
            reasoning = final_state.get("reasoning")
            if not reasoning:
                reasoning = final_state.get("message") or final_state.get("thinking", "Processed with LangGraph workflow")
            
            # Add workflow execution summary to reasoning
            reasoning += f"\n\n🔍 **Workflow Execution Summary:**\n" + "\n".join(workflow_execution_log)
            
            # Build response
            response = VoiceProcessingResponse(
                transcription=transcription,
                extracted_data=extracted_data,
                confidence=final_state.get("confidence", 0.85),
                suggested_fields=final_state.get("suggested_fields", []),
                reasoning=reasoning,
                commit_id=final_state.get("commit_ids", [None])[0] if final_state.get("commit_ids") else None,
                workflow_plan=final_state.get("plan"),
                tool_events=tool_events
            )
            
            debug_print(f"🚀 MAIN PROCESS: Returning response with {len(tool_events)} tool events")
            debug_print(f"🚀 MAIN PROCESS: Response reasoning: {reasoning[:100]}...")
            debug_print(f"🚀 MAIN PROCESS: Workflow execution log: {workflow_execution_log}")
            return response
            
        except Exception as e:
            debug_print(f"🚀 MAIN PROCESS: ERROR - {e}")
            import traceback
            debug_print(f"🚀 MAIN PROCESS: TRACEBACK - {traceback.format_exc()}")
            workflow_execution_log.append(f"❌ Error occurred: {e}")
            
            return VoiceProcessingResponse(
                transcription=transcription if 'transcription' in locals() else "Transcription failed",
                extracted_data={
                    "error": str(e), 
                    "debug_info": {
                        "workflow_completed": False,
                        "workflow_execution_log": workflow_execution_log,
                        "error_traceback": traceback.format_exc()
                    }
                },
                confidence=0.0,
                suggested_fields=[],
                reasoning=f"Processing failed: {str(e)}\n\n🔍 **Workflow Execution Log:**\n" + "\n".join(workflow_execution_log),
                commit_id=None
            )