# Chert Backend - Voice Agent Integration

This document explains the LangGraph voice agent implementation and Supabase integration for the Chert archaeological data collection system.

## 🏗️ Architecture

The backend implements a sophisticated LangGraph-based voice agent that:

1. **Transcribes** voice input using OpenAI Whisper
2. **Parses intent** from archaeological commands
3. **Plans workflows** based on database schema and user needs
4. **Executes** data collection with human-in-the-loop verification
5. **Writes** verified data to Supabase with full audit trail

## 🔧 Components

### Voice Agent (`voice_agent.py`)
- **LangGraph Workflow**: State machine with intent parsing, planning, execution, and writing nodes
- **Tool Integration**: Schema introspection, computer vision, database operations
- **OpenAI Integration**: GPT-4o for reasoning, Whisper for transcription
- **Computer Vision**: YOLO + GPT-4o for artifact detection and classification

### Supabase Client (`supabase_client.py`)
- **Database Operations**: CRUD operations for projects, records, and audit logs
- **Schema Analysis**: Dynamic database schema introspection
- **Audit Trail**: Complete rollback capabilities with versioned changes
- **Connection Management**: Handles both anonymous and service role connections

### Models (`models.py`)
- **Pydantic Models**: Type-safe data models for all API operations
- **LangGraph State**: TypedDict for agent state management
- **Response Models**: Structured responses for frontend integration

## 🚀 Quick Start

### 1. Environment Setup

Ensure your `.env` file contains:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Replicate Configuration (for YOLO)
REPLICATE_API_TOKEN=your_replicate_api_token_here
YOLO_VERSION=yolov8n
YOLO_CONFIDENCE=0.25
```

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Test Integration

```bash
python test_integration.py
```

### 4. Start Server

```bash
python start.py
```

## 🎯 API Endpoints

### Voice Processing
- `POST /voice/process` - Full workflow processing with LangGraph agent
- `POST /voice/transcribe` - Simple audio transcription

### Project Management
- `GET /projects` - List all projects
- `POST /projects` - Create new project
- `GET /projects/{id}` - Get project details
- `PUT /projects/{id}` - Update project

### Data Records
- `GET /projects/{id}/records` - Get project data records
- `POST /projects/{id}/records` - Create new data record

### Schema Analysis
- `GET /projects/{id}/schema` - Analyze database schema

### Audit & Rollback
- `GET /audit/{commit_id}` - Get audit details
- `POST /audit/{commit_id}/rollback` - Rollback changes

## 🤖 Voice Agent Workflow

### Example Usage

1. **User says**: "Please record a new bag-dump of fine-ware pottery sherds"

2. **Intent Parser**: Extracts structured intent
   ```json
   {
     "task_type": "record_artifacts",
     "domain": "pottery", 
     "specific_request": "record bag-dump of fine-ware sherds",
     "artifacts_mentioned": ["pottery", "sherds"],
     "location_context": "bag-dump"
   }
   ```

3. **Planner**: Creates workflow plan
   ```json
   {
     "summary": "Record pottery sherds with photo documentation",
     "steps": [
       {"type": "photo", "prompt": "Please photograph the bag-dump"},
       {"type": "vision", "model": "yolo"},
       {"type": "verification", "prompt": "Verify detected artifacts"},
       {"type": "write", "target_table": "samples"}
     ]
   }
   ```

4. **Executor**: Runs workflow steps
   - Requests photo from user
   - Processes image with YOLO + GPT-4o
   - Requests user verification
   - Prepares data for database

5. **Writer**: Commits verified data with audit trail

## 🔧 Tools Available to Agent

### Database Tools
- `introspect_schema(project_id)` - Get database schema
- `sample_rows(project_id, n)` - Get example data for few-shot learning
- `write_rows(rows, project_id)` - Commit data with audit trail

### Computer Vision Tools
- `vision_label(image_url, project_id)` - YOLO detection + GPT-4o classification

### User Interaction Tools
- `ask_photo()` - Request photo from user
- `user_audio(prompt)` - Request audio input
- `user_info(prompt)` - Request text information

## 📊 Database Schema

The system supports flexible schemas but provides defaults for archaeological work:

### Samples Table
- `id` (uuid, primary key)
- `project_id` (uuid, foreign key)
- `artifact_type` (text) - pottery, lithic, bone, etc.
- `description` (text)
- `weight` (float) - in grams
- `dimensions` (text)
- `material` (text)
- `context` (text)
- `image_url` (text)
- `created_at` (timestamptz)

### Features Table
- `id` (uuid, primary key)
- `project_id` (uuid, foreign key)
- `feature_type` (text)
- `description` (text)
- `location` (jsonb) - GPS coordinates
- `dimensions` (text)
- `created_at` (timestamptz)

### Audit Log Table
- `id` (uuid, primary key)
- `commit_id` (uuid)
- `project_id` (uuid)
- `action` (text)
- `affected_records` (text[])
- `data_diff` (jsonb)
- `timestamp` (timestamptz)

## 🔄 Audit & Rollback System

Every data operation creates an audit record:

```python
# Rollback example
await supabase_client.rollback_commit("commit-id-123")
```

This will:
1. Find all records created in that commit
2. Delete them from the database
3. Log the rollback action
4. Return success confirmation

## 🧪 Testing

### Unit Tests
```bash
python -m pytest tests/
```

### Integration Tests
```bash
python test_integration.py
```

### Manual Testing with cURL

```bash
# Test transcription
curl -X POST "http://localhost:8000/voice/transcribe" \
  -F "audio_file=@test_audio.wav"

# Test full processing
curl -X POST "http://localhost:8000/voice/process" \
  -F "audio_file=@test_audio.wav" \
  -F "project_id=project-123"
```

## 🚨 Troubleshooting

### Common Issues

1. **"Supabase client not initialized"**
   - Check your `.env` file has valid Supabase credentials
   - Ensure `await supabase_client.initialize()` is called

2. **"OpenAI API key not found"**
   - Add `OPENAI_API_KEY` to your `.env` file

3. **"YOLO detection failed"**
   - Add `REPLICATE_API_TOKEN` to your `.env` file
   - Or disable computer vision for testing

4. **"Audio transcription failed"**
   - Ensure audio file is in supported format (WAV, MP3, M4A)
   - Check OpenAI API key and quota

### Debug Mode

Set `DEBUG=true` in your `.env` file for verbose logging.

## 🎯 Frontend Integration

The voice agent integrates with the React Native frontend through:

1. **Audio Recording**: Frontend records audio and sends to `/voice/process`
2. **Workflow Steps**: Agent returns interactive prompts (photo, verification)
3. **Real-time Updates**: WebSocket or polling for workflow progress
4. **Data Display**: Structured responses show extracted data

### Example Frontend Flow

```typescript
// Record and process voice
const result = await ApiService.processVoiceInput(audioBlob, projectId);

// Handle workflow steps
for (const event of result.tool_events) {
  if (event.ask_photo) {
    // Show camera modal
    const photo = await showCameraModal();
    // Continue workflow with photo
  }
}

// Display results
showExtractedData(result.extracted_data);
```

## 📈 Performance

- **Transcription**: ~2-5 seconds for 30-second audio
- **Intent Parsing**: ~1-2 seconds
- **Computer Vision**: ~5-10 seconds (depends on Replicate queue)
- **Database Operations**: ~100-500ms

## 🔐 Security

- All API keys stored in environment variables
- Supabase RLS (Row Level Security) enforced
- Audio files temporarily stored and cleaned up
- Audit trail for all data operations

## 🎨 Customization

### Adding New Tools

```python
@tool
async def my_custom_tool(param: str) -> Dict[str, Any]:
    """Description of what the tool does"""
    # Implementation
    return {"result": "success"}

# Add to tools list
self.tools.append(my_custom_tool)
```

### Custom Intent Types

Modify the intent parser system prompt to recognize new archaeological domains or task types.

### Schema Adaptation

Update `analyze_schema()` method in `supabase_client.py` to introspect your specific database schema.

---

For questions or issues, please check the main repository README or create an issue on GitHub.
