import os
import uuid
import json
import logging
import requests
import re
from typing import Dict, List, Any, Optional, Union, Tuple
from datetime import datetime
from langchain_openai import ChatOpenAI
# Removed complex agent imports - using simple LLM only
import openai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")

# Global variables for workflow state
CURRENT_TABLE_SCHEMA = None
PLANNED_WORKFLOW = None
SUGGESTED_WORKFLOW = None

def get_headers() -> Dict[str, str]:
    """Get headers for Supabase API requests."""
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

from models import (
    VoiceProcessingResponse, Detection, 
    RecordMetadata, DataRecordCreate
)
from supabase_client import SupabaseClient

# Configure logging

def get_project_schema_from_firebase(project_id: str, provided_schema: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Fetch the project schema from Firebase or use provided schema.
    
    Args:
        project_id: The Firebase project ID
        provided_schema: Schema data provided from the frontend
        
    Returns:
        List of column definitions with name, type, required, and auto fields
    """
    try:
        debug_print(f"🔍 get_project_schema_from_firebase called with:")
        debug_print(f"  project_id: {project_id}")
        debug_print(f"  provided_schema: {provided_schema}")
        debug_print(f"  provided_schema type: {type(provided_schema)}")
        
        # If we have a provided schema from the frontend, use it
        if provided_schema:
            debug_print(f"✅ Using provided schema for project {project_id}")
            
            columns = []
            # Add standard auto fields
            columns.extend([
                {"name": "id", "type": "uuid", "description": "Primary key", "required": False, "auto": True},
                {"name": "created_at", "type": "timestamp", "description": "Record creation time", "required": False, "auto": True},
                {"name": "confidence", "type": "numeric", "description": "AI confidence score", "required": False, "auto": True}
            ])
            
            # Add data columns from the project schema
            if "dataColumns" in provided_schema:
                debug_print(f"📊 Found dataColumns: {provided_schema['dataColumns']}")
                debug_print(f"📊 Number of dataColumns: {len(provided_schema['dataColumns'])}")
                for col_name in provided_schema["dataColumns"]:
                    # Get annotation for this column if available
                    annotation = ""
                    if "columnAnnotations" in provided_schema and col_name in provided_schema["columnAnnotations"]:
                        annotation = provided_schema["columnAnnotations"][col_name]
                    
                    # Infer field type from name and annotation
                    field_type = "text"  # default
                    if any(keyword in col_name.lower() for keyword in ["id", "identifier"]):
                        field_type = "text"
                    elif any(keyword in col_name.lower() for keyword in ["measurement", "size", "length", "width", "height", "weight"]):
                        field_type = "numeric"
                    elif any(keyword in annotation.lower() for keyword in ["number", "numeric", "measurement", "millimeter", "centimeter"]):
                        field_type = "numeric"
                    
                    columns.append({
                        "name": col_name,
                        "type": field_type,
                        "description": annotation or f"{col_name} field",
                        "required": True,  # Assume required unless specified otherwise
                        "auto": False
                    })
                    debug_print(f"  ➕ Added column: {col_name} ({field_type})")
            else:
                debug_print(f"❌ No 'dataColumns' found in provided_schema keys: {list(provided_schema.keys())}")
            
            # Add sample data if available for better context
            if "csvMetadata" in provided_schema and provided_schema["csvMetadata"]:
                csv_metadata = provided_schema["csvMetadata"]
                if "sampleRows" in csv_metadata and csv_metadata["sampleRows"]:
                    # Store sample data in the schema for use in prompting
                    debug_print(f"Adding sample data: {csv_metadata['sampleRows'][:2]}...")  # Log first 2 samples
                    for col in columns:
                        if not col.get("auto", False):
                            col["sample_data"] = csv_metadata["sampleRows"][:5]  # Up to 5 samples
            
            debug_print(f"✅ Generated schema with {len(columns)} columns")
            data_column_names = [col['name'] for col in columns if not col.get('auto', False)]
            debug_print(f"📋 Data column names for LLM: {data_column_names}")
            return columns
        
        # Fallback if no schema provided - use basic fields only  
        debug_print(f"No schema provided for project {project_id}, using minimal fallback")
        return [
            {"name": "id", "type": "uuid", "description": "Primary key", "required": False, "auto": True},
            {"name": "created_at", "type": "timestamp", "description": "Record creation time", "required": False, "auto": True},
            {"name": "confidence", "type": "numeric", "description": "AI confidence score", "required": False, "auto": True},
            {"name": "extracted_text", "type": "text", "description": "Raw extracted text", "required": False, "auto": False}
        ]
        
    except Exception as e:
        debug_print(f"Error processing project schema: {e}")
        raise Exception(f"Project schema configuration error: {e}. Please configure your project schema properly.")

def introspect_table_schema(table_name: str, project_id: str = None, project_schema: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Introspect the schema of a database table, with project-specific schema loading.
    
    Args:
        table_name: Name of the table to introspect
        project_id: Firebase project ID to fetch dynamic schema
        project_schema: Provided project schema from the frontend
        
    Returns:
        List of column definitions with name, type, required, and auto fields
    """
    # If we have a project_id, try to fetch the dynamic schema
    if project_id:
        return get_project_schema_from_firebase(project_id, project_schema)
    
    # No fallback - require proper project configuration
    raise Exception("No project ID provided. Project schema configuration is required for data extraction.")

# Configure logging
logger = logging.getLogger(__name__)

def debug_print(message: str):
    """Print debug message both to logger and stdout"""
    logger.info(message)
    print(f"[DEBUG] {message}")

def _write_data_to_supabase(table_name: str, data: Dict[str, Any]) -> str:
    try:
        print(f"DEBUG: Writing to table '{table_name}'")
        print(f"DEBUG: Data to write: {data}")
        print(f"DEBUG: Full URL: {SUPABASE_URL}/rest/v1/{table_name}")
        
        if 'created_at' not in data:
            data['created_at'] = datetime.now().isoformat()
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/{table_name}",
            headers=get_headers(),
            json=data,
            timeout=10
        )
        
        print(f"DEBUG: Response status: {response.status_code}")
        print(f"DEBUG: Response text: {response.text}")
        
        if response.status_code in [200, 201]:
            commit_id = str(uuid.uuid4())
            print(f"\nDATABASE INSERT → {table_name}: 1 row")
            print(f"Data: {data}")
            
            try:
                response_data = response.json()
                print(f"Insert successful! Response: {response_data}")
            except:
                print("Insert successful!")
            
            return f"Successfully wrote 1 row to {table_name}. Commit ID: {commit_id}"
        else:
            error_msg = f"Database write failed: HTTP {response.status_code} - {response.text}"
            print(f"{error_msg}")
            return f"{error_msg}"
        
    except Exception as e:
        error_msg = f"Error writing to database: {str(e)}"
        print(f"{error_msg}")
        return f"{error_msg}"

def VisionDetectLabel(_img):
    """Mock vision detection - replace with actual computer vision."""
    return [{"label": "rim", "conf": 0.82}, {"label": "base", "conf": 0.78}]

class VoiceAgent:
    def __init__(self, supabase_client: SupabaseClient):
        """Initialize the VoiceAgent with Supabase client and LLM"""
        self.supabase = supabase_client
        self.openai_client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",  # Use more cost-effective model for extraction
            temperature=0.1,      # Lower temperature for more consistent extraction
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        
        debug_print("VoiceAgent initialized successfully")
    
    def _get_schema(self) -> Dict[str, Any]:
        """Get the database schema for the project"""
        try:
            if hasattr(self, 'project_id'):
                # Try to get project-specific schema with provided schema data
                project_schema = getattr(self, 'project_schema', None)
                return {
                    "table_name": "samples",
                    "columns": introspect_table_schema("samples", self.project_id, project_schema)
                }
            else:
                raise Exception("No project ID set")
        except Exception as e:
            logger.error(f"Error getting schema: {e}")
            raise Exception(f"Schema error: {e}")
    
    def _write_to_database(self, table_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Skip database write - mobile app handles storage"""
        try:
            # Don't write to database - let mobile app handle storage locally and sync to Firebase
            logger.info(f"Skipping database write for table '{table_name}'. Mobile app will handle storage.")
            return {"success": True, "message": "Data extraction successful - mobile app will handle storage"}
        except Exception as e:
            logger.error(f"Error in write handler: {e}")
            return {"error": str(e), "success": False}

    def _extract_with_llm(self, text: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Use LLM to extract structured data with schema and sample data context"""
        try:
            if not schema or "columns" not in schema:
                debug_print("_extract_with_llm: No schema or columns found")
                return {}
            
            columns = schema["columns"] 
            data_columns = [col for col in columns if not col.get("auto", False)]
            
            debug_print(f"🔍 LLM extraction schema analysis:")
            debug_print(f"  Total columns: {len(columns)}")
            debug_print(f"  Data columns (non-auto): {len(data_columns)}")
            debug_print(f"  Data column names: {[col.get('name') for col in data_columns]}")
            
            if not data_columns:
                debug_print("❌ No data columns found in schema for LLM extraction - returning empty")
                return {}
            
            # Build schema description with exact field names
            schema_desc = "Extract data for these fields (use EXACT field names in JSON):\n"
            valid_fields = []
            for col in data_columns:
                name = col.get("name", "")
                col_type = col.get("type", "text")
                description = col.get("description", "")
                schema_desc += f'- "{name}" ({col_type}): {description}\n'
                valid_fields.append(name)
            
            # Add sample data if available
            sample_context = ""
            if data_columns and "sample_data" in data_columns[0]:
                sample_data = data_columns[0]["sample_data"]
                if sample_data:
                    sample_context = "\n\nExample data rows:\n"
                    for i, sample in enumerate(sample_data[:3], 1):
                        sample_context += f"Example {i}: {sample}\n"
            
            # Create extraction prompt
            prompt = f"""You are an expert data extraction assistant. Extract structured data from the following text.

{schema_desc}{sample_context}

INSTRUCTIONS:
- Extract ONLY the information that is explicitly mentioned in the text
- Use EXACT field names as shown above: {valid_fields}
- Return valid JSON format
- If information for a field is not mentioned, omit that field completely
- For the input "I want to record glass, thanks!", you should extract {{"material": "glass"}}

Text to analyze: "{text}"

Extract the data as JSON:"""

            # Use the LLM to extract data
            from langchain.schema import HumanMessage
            
            debug_print(f"Calling LLM with prompt of length: {len(prompt)}")
            debug_print("="*80)
            debug_print("FULL LLM PROMPT:")
            debug_print(prompt)
            debug_print("="*80)
            
            # Also log via standard logging to ensure it appears
            logger.info(f"Calling LLM with prompt of length: {len(prompt)}")
            logger.info("="*80)
            logger.info("FULL LLM PROMPT:")
            logger.info(prompt)
            logger.info("="*80)
            
            try:
                response = self.llm.invoke([HumanMessage(content=prompt)])
                debug_print(f"LLM call successful, response type: {type(response)}")
            except Exception as llm_error:
                debug_print(f"LLM call failed: {llm_error}")
                raise Exception(f"LLM extraction failed: {llm_error}")
            
            # Parse the response
            response_text = response.content.strip()
            debug_print("="*80)
            debug_print("FULL LLM RESPONSE:")
            debug_print(f"{response_text}")
            debug_print("="*80)
            
            # Also log via standard logging to ensure it appears
            logger.info("="*80)
            logger.info("FULL LLM RESPONSE:")
            logger.info(f"{response_text}")
            logger.info("="*80)
            
            # Try to extract JSON from the response
            import json
            import re
            
            # Look for JSON in the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                debug_print(f"Found JSON string: {json_str}")
                try:
                    extracted_data = json.loads(json_str)
                    debug_print(f"Successfully parsed JSON: {extracted_data}")
                    
                    # Validate and filter to only include valid field names (case-insensitive)
                    filtered_data = {}
                    debug_print(f"Valid fields from schema: {valid_fields}")
                    debug_print(f"LLM returned fields: {list(extracted_data.keys())}")
                    
                    # Create case-insensitive mapping
                    valid_fields_lower = {field.lower(): field for field in valid_fields}
                    debug_print(f"Case-insensitive field mapping: {valid_fields_lower}")
                    
                    for key, value in extracted_data.items():
                        # Check exact match first
                        if key in valid_fields:
                            filtered_data[key] = value
                            debug_print(f"✅ Accepted field (exact match): {key} = {value}")
                        # Check case-insensitive match
                        elif key.lower() in valid_fields_lower:
                            correct_field_name = valid_fields_lower[key.lower()]
                            filtered_data[correct_field_name] = value
                            debug_print(f"✅ Accepted field (case-corrected): {key} -> {correct_field_name} = {value}")
                        else:
                            debug_print(f"❌ REJECTED invalid field '{key}' (not in schema valid fields)")
                    
                    debug_print(f"Final filtered data: {filtered_data}")
                    
                    # Log summary of what happened
                    original_fields = list(extracted_data.keys())
                    final_fields = list(filtered_data.keys())
                    rejected_fields = [f for f in original_fields if f not in final_fields and f.lower() not in [k.lower() for k in final_fields]]
                    debug_print(f"EXTRACTION SUMMARY:")
                    debug_print(f"  LLM returned: {original_fields}")
                    debug_print(f"  After validation: {final_fields}")
                    debug_print(f"  Rejected fields: {rejected_fields}")
                    
                    return filtered_data
                except json.JSONDecodeError as parse_error:
                    debug_print(f"Failed to parse JSON from LLM response: {json_str}")
                    debug_print(f"JSON parse error: {parse_error}")
            else:
                debug_print("No JSON found in LLM response!")
                debug_print(f"Response was: '{response_text}'")
            
            return {}
            
        except Exception as e:
            debug_print(f"Error in LLM extraction: {e}")
            raise Exception(f"LLM extraction failed: {e}")

    async def process_voice_input(
        self,
        project_id: str,
        audio_file_path: str,
        context: Optional[str] = None,
        project_schema: Optional[Dict[str, Any]] = None
    ) -> VoiceProcessingResponse:
        """
        Process voice input from the user
        
        Args:
            project_id: The ID of the project
            audio_file_path: Path to the audio file
            context: Optional context for the conversation
            
        Returns:
            VoiceProcessingResponse with the results
        """
        # Store project_id and schema as instance variables for use in tools
        self.project_id = project_id
        self.project_schema = project_schema
        
        try:
            # Transcribe audio to text
            transcription = await self._transcribe_audio(audio_file_path)
            
            # Process the transcription with the agent
            response = await self._process_text_input(transcription, context)
            
            return response
            
        except Exception as e:
            logger.error(f"Error in process_voice_input: {e}")
            return VoiceProcessingResponse(
                transcription="",
                extracted_data={},
                confidence=0.0,
                suggested_fields=[],
                reasoning=f"Error processing voice input: {str(e)}"
            )

    async def _transcribe_audio(self, audio_file_path: str) -> str:
        """Transcribe audio file to text using OpenAI's Whisper API"""
        try:
            # Log file information for debugging
            file_size = os.path.getsize(audio_file_path)
            file_extension = os.path.splitext(audio_file_path)[1]
            logger.info(f"Transcribing audio file: {audio_file_path}")
            logger.info(f"File size: {file_size} bytes, Extension: {file_extension}")
            
            with open(audio_file_path, "rb") as audio_file:
                transcript = await self.openai_client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-1",
                    response_format="text"
                )
            logger.info(f"Transcription successful, length: {len(transcript)} characters")
            return transcript
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            
            # Provide more specific error information
            if "Invalid file format" in str(e):
                file_extension = os.path.splitext(audio_file_path)[1]
                logger.error(f"File format issue - Extension: {file_extension}, Size: {os.path.getsize(audio_file_path)} bytes")
                raise Exception(f"Audio file format not supported by OpenAI. File extension: {file_extension}. Error: {str(e)}")
            
            raise Exception(f"Audio transcription failed: {str(e)}")

    async def transcribe_audio(self, audio_file_path: str) -> str:
        """Public method to transcribe audio file to text"""
        return await self._transcribe_audio(audio_file_path)

    async def _process_text_input(self, text: str, context: Optional[str] = None) -> VoiceProcessingResponse:
        """Process text input with the agent"""
        try:
            import json
            
            debug_print(f"Processing text input: '{text}'")
            
            # FIRST: Check if this is an analytics question (priority over general questions)
            analytics_keywords = ["analytics", "statistics", "stats", "analysis", "summary", "overview", 
                                "completeness", "progress", "unique values", "field analysis", "data summary",
                                "how many", "total records", "most common", "common values", "unique", "count",
                                "database size", "size", "records"]
            is_analytics_question = any(keyword in text.lower() for keyword in analytics_keywords)
            
            # SECOND: Check for general questions (but not if already detected as analytics)
            question_keywords = ["explain", "what", "how", "why", "describe", "tell me", "show me"]
            is_general_question = any(keyword in text.lower() for keyword in question_keywords) and not is_analytics_question
            
            if is_analytics_question or is_general_question:
                debug_print(f"Detected question - Analytics: {is_analytics_question}, General: {is_general_question}")
                
                # Create a unified question-answering prompt that uses the LLM for ALL responses
                if is_analytics_question:
                    prompt_type = "analytics and statistics"
                    instruction = "Answer their analytics question using the project data information provided. Focus on data insights, counts, patterns, and statistics."
                else:
                    prompt_type = "general information"
                    instruction = "Answer their question about the database or provide helpful information about data collection."
                
                # Build dynamic prompt for LLM to handle all questions
                question_prompt = f"""You are an AI assistant answering questions about a data collection project.
                The user asked: "{text}"
                
                This is a {prompt_type} question. {instruction}
                
                IMPORTANT: Keep your response very brief - maximum 2-3 short sentences.
                Provide a helpful, accurate response based on the project information below.
                Do not try to extract structured data - just answer their question naturally.
                """
                
                # Add project context to question prompt
                if context:
                    question_prompt += f"\nContext: {context}"
                
                # Add project data context
                try:
                    if hasattr(self, 'project_schema') and self.project_schema:
                        analytics_context = "\n\nPROJECT DATA INFORMATION:\n"
                        
                        # Add CSV metadata
                        if "csvMetadata" in self.project_schema and self.project_schema["csvMetadata"]:
                            csv_meta = self.project_schema["csvMetadata"]
                            analytics_context += f"- Total records in database: {csv_meta.get('totalRows', 0)}\n"
                            if "sampleRows" in csv_meta and csv_meta["sampleRows"]:
                                sample_count = len(csv_meta["sampleRows"])
                                analytics_context += f"- Sample data available: {sample_count} examples\n"
                                analytics_context += "- Sample data entries:\n"
                                for i, sample in enumerate(csv_meta["sampleRows"][:3]):
                                    analytics_context += f"  {i+1}. {sample}\n"
                                    
                        # Add data columns information
                        if "dataColumns" in self.project_schema and self.project_schema["dataColumns"]:
                            columns = self.project_schema["dataColumns"]
                            analytics_context += f"- Number of data fields: {len(columns)}\n"
                            analytics_context += f"- Field names: {', '.join(columns)}\n"
                            
                            # Add annotations if available
                            if "columnAnnotations" in self.project_schema:
                                annotations = self.project_schema["columnAnnotations"]
                                if annotations:
                                    analytics_context += "- Field descriptions:\n"
                                    for field, desc in annotations.items():
                                        analytics_context += f"  * {field}: {desc}\n"
                        
                        # Add general annotations
                        if "generalAnnotations" in self.project_schema and self.project_schema["generalAnnotations"]:
                            analytics_context += f"- Project description: {self.project_schema['generalAnnotations']}\n"
                        
                        question_prompt += analytics_context
                        
                except Exception as context_error:
                    debug_print(f"Could not add project context: {context_error}")
                
                # Use LLM to answer the question dynamically
                from langchain.schema import HumanMessage
                try:
                    response = self.llm.invoke([HumanMessage(content=question_prompt)])
                    question_response = response.content.strip()
                    debug_print(f"Question response: {question_response}")
                    
                    return VoiceProcessingResponse(
                        transcription=text,
                        extracted_data={},
                        confidence=0.9,
                        suggested_fields=[],
                        reasoning=question_response,
                        workflow_plan={
                            "steps": ["provide_information"],
                            "status": "completed"
                        }
                    )
                except Exception as e:
                    debug_print(f"Error generating question response: {e}")
                    return VoiceProcessingResponse(
                        transcription=text,
                        extracted_data={},
                        confidence=0.7,
                        suggested_fields=[],
                        reasoning="I couldn't process your question right now. Please try asking in a different way.",
                        workflow_plan={
                            "steps": ["question_error"],
                            "status": "failed"
                        }
                    )
            
            # If we reach here, it's not a question - proceed with data extraction
            debug_print("Processing as data extraction request")
            
            # Initialize extracted_data
            extracted_data = {}
            
            # Get schema information for data extraction
            schema = self._get_schema()
            debug_print(f"Retrieved schema: {schema}")
            
            # Also log the raw project schema if available
            if hasattr(self, 'project_schema') and self.project_schema:
                debug_print(f"Raw project schema from frontend: {self.project_schema}")
            else:
                debug_print("No project schema provided from frontend")
            
            # SIMPLIFIED: Direct LLM extraction only
            debug_print("Using direct LLM extraction with project schema")
            
            # Extract structured data directly using the LLM with schema
            debug_print(f"About to call _extract_with_llm with text: '{text}'")
            debug_print(f"Schema being passed: {schema}")
            extracted_data = self._extract_with_llm(text, schema)
            debug_print(f"LLM extraction returned: {extracted_data}")
            debug_print(f"Type of extracted_data: {type(extracted_data)}")
            
            # If we have extracted data, write it to the database
            database_result = None
            debug_print(f"Checking if extracted_data has values: extracted_data={extracted_data}")
            debug_print(f"extracted_data bool: {bool(extracted_data)}")
            if extracted_data:
                debug_print(f"extracted_data.values(): {list(extracted_data.values())}")
                debug_print(f"any(extracted_data.values()): {any(extracted_data.values())}")
            
            if extracted_data and any(extracted_data.values()):
                try:
                    # Determine table name from schema or default to samples
                    table_name = "samples"
                    if isinstance(schema, dict) and "table_name" in schema:
                        table_name = schema["table_name"]
                    
                    debug_print(f"Writing extracted data to {table_name}: {extracted_data}")
                    
                    # Write to database directly
                    database_result = self._write_to_database(table_name, extracted_data)
                    debug_print(f"Database write result: {database_result}")
                    
                except Exception as db_error:
                    logger.error(f"Error writing to database: {db_error}")
                    database_result = {"error": str(db_error), "success": False}
            else:
                debug_print("No structured data was extracted from the text")
                
            # Determine status and create appropriate response
            if database_result and database_result.get("success", False):
                status = "completed"
                reasoning = ""  # No message for successful data recording
            elif extracted_data:
                status = "partial"  
                reasoning = f"Extracted data: {extracted_data}, but database write failed"
            else:
                status = "no_data"
                reasoning = f"No structured data could be extracted from the input text. Please ensure your data matches the project schema fields."
            
            return VoiceProcessingResponse(
                transcription=text,
                extracted_data=extracted_data,
                confidence=0.9,  # Adjust based on confidence
                suggested_fields=[],
                reasoning=reasoning,
                workflow_plan={
                    "steps": ["transcribe", "extract_data", "store_in_database"],
                    "status": status,
                    "database_result": database_result
                }
            )
            
        except Exception as e:
            logger.error(f"Error in _process_text_input: {e}")
            return VoiceProcessingResponse(
                transcription=text,
                extracted_data={},
                confidence=0.0,
                suggested_fields=[],
                reasoning=f"Error processing text input: {str(e)}"
            )
    
    async def _get_project_analytics_from_firebase(self, db, project_id: str) -> dict:
        """Fetch analytics data from Firebase for the project"""
        try:
            debug_print(f"Fetching analytics for project {project_id} from Firebase")
            
            # Get the user ID (this would need to be passed in or determined)
            # For now, we'll return mock data - real implementation would query Firebase
            analytics_data = {
                "totalRecords": 0,
                "uniqueValues": {},
                "fieldCompleteness": {},
                "topValues": {},
                "recentActivity": []
            }
            
            debug_print(f"Analytics data retrieved: {analytics_data}")
            return analytics_data
            
        except Exception as e:
            debug_print(f"Error fetching analytics from Firebase: {e}")
            return None
    
    def _get_analytics_summary_for_prompt(self) -> str:
        """Get a brief analytics summary to include in LLM prompts"""
        try:
            if hasattr(self, 'project_id'):
                # This would fetch real analytics in production
                # For now, return a template that the LLM can use
                return """ANALYTICS CONTEXT:
                - You can help users understand their data collection progress
                - Common analytics queries include field completeness, unique values, and data summaries
                - Respond helpfully to questions about statistics and analysis
                - If asked for specific analytics, provide a conversational response about data insights"""
        except Exception as e:
            debug_print(f"Error getting analytics summary: {e}")
        return ""
    
    def _format_analytics_response(self, analytics_data: dict) -> str:
        """Format analytics data into a readable response"""
        try:
            total_records = analytics_data.get("totalRecords", 0)
            unique_values = analytics_data.get("uniqueValues", {})
            field_completeness = analytics_data.get("fieldCompleteness", {})
            top_values = analytics_data.get("topValues", {})
            recent_activity = analytics_data.get("recentActivity", [])
            
            if total_records == 0:
                return "No data has been recorded yet. Start recording to see analytics!"
            
            response = f"📊 **Your Project Analytics**\n\n"
            response += f"**Data Overview**\n"
            response += f"• Total Records: {total_records}\n"
            response += f"• Data Fields: {len(field_completeness)}\n"
            
            if field_completeness:
                avg_completeness = sum(field_completeness.values()) / len(field_completeness)
                response += f"• Average Completeness: {avg_completeness:.0f}%\n\n"
                
                response += f"**Field Completeness**\n"
                for field, completeness in field_completeness.items():
                    unique_count = unique_values.get(field, 0)
                    response += f"• {field}: {completeness}% complete, {unique_count} unique values\n"
                
                if top_values:
                    response += f"\n**Most Common Values**\n"
                    for field, values in top_values.items():
                        if values:
                            value_str = ", ".join([f"{v['value']} ({v['count']})" for v in values[:3]])
                            response += f"• {field}: {value_str}\n"
            
            if recent_activity:
                response += f"\n**Recent Activity**: {len(recent_activity)} recent entries"
            
            response += f"\n\n💡 Ask me about specific fields or request detailed statistics!"
            
            return response
            
        except Exception as e:
            debug_print(f"Error formatting analytics response: {e}")
            return "Analytics data is available but couldn't be formatted properly."

    async def _vision_detect_label(self, image_url: str) -> List[Detection]:
        """Detect objects in an image using computer vision"""
        try:
            # This is a placeholder - implement actual computer vision here
            # For example, you might use a service like Replicate or a local model
            
            # For now, return a mock detection
            return [
                Detection(
                    bbox=[0.1, 0.1, 0.8, 0.8],
                    label="pottery",
                    confidence=0.9
                )
            ]
        except Exception as e:
            logger.error(f"Error in vision detection: {e}")
            return []

def plan_workflow(user_request: str) -> Dict[str, Any]:
    """Plan a workflow based on user request"""
    # Simple keyword-based planning
    request_lower = user_request.lower()
    
    # Determine table based on keywords
    if any(word in request_lower for word in ["sherd", "ceramic", "pottery", "bag"]):
        table_name = "samples"
        nickname = "Ceramic Sherd Classification"
        reasoning = "Detected ceramic/pottery keywords, using samples table for artifact classification"
    elif any(word in request_lower for word in ["soil", "sediment", "earth"]):
        table_name = "soil"
        nickname = "Soil Sample Recording"
        reasoning = "Detected soil-related keywords, using soil table"
    elif any(word in request_lower for word in ["artifact", "tool", "stone", "lithic"]):
        table_name = "artifacts"
        nickname = "Artifact Recording"
        reasoning = "Detected artifact-related keywords, using artifacts table"
    else:
        table_name = "samples"
        nickname = "General Sample Recording"
        reasoning = "No specific keywords detected, defaulting to samples table"
    
    return {
        "nickname": nickname,
        "schema_table": table_name,
        "reasoning": reasoning,
        "steps": [
            {"tool": "GetSchema"},
            {"ask": "dynamic_fields"},
            {"tool": "WriteToDatabase"}
        ]
    }

#Workflow (hardcoded)

WORKFLOWS = {
    "bag_dump_fineware": {
        "nickname": "Ceramic Sherd Classification",
        "schema_table": "samples",
        "steps": [
            {"ask":"photo","prompt":"Take a picture of the bag."},
            {"tool":"VisionDetectLabel"},
            {"tool":"GetSchema"},
            {"ask":"dynamic_fields"},
            {"tool":"WriteToDatabase"}
        ]
    },
    "generalized": {
        "nickname": "Generalized Data Recording",
        "schema_table": None,  # Will be determined dynamically
        "steps": [
            {"tool":"PlanWorkflow"},
            {"tool":"ExecutePlannedWorkflow"}
        ]
    }
}

# Legacy tools section removed - using simplified LLM extraction only

# Analytics Voice Commands Support
# The voice agent now supports analytics queries with keywords like:
# - "show me analytics", "what are my statistics", "data summary"
# - "field completeness", "unique values", "data analysis"
# - "project overview", "data progress", "statistics overview"