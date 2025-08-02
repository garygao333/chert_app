from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
import logging
from typing import Dict, List, Any, Optional
import asyncio
import uuid
import time
from datetime import datetime
import json

# Load environment variables
load_dotenv()

# Import our modules
from voice_agent import VoiceAgent
from supabase_client import SupabaseClient
from models import (
    ProjectCreate, ProjectResponse, DataRecordCreate, DataRecordResponse,
    VoiceProcessingRequest, VoiceProcessingResponse, SchemaAnalysisResponse
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Chert Data Collection API",
    description="AI-powered data collection system for archaeological field work",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
supabase_client = SupabaseClient()
voice_agent = VoiceAgent(supabase_client)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Chert API server...")
    await supabase_client.initialize()
    logger.info("Services initialized successfully")

@app.get("/")
async def root():
    return {"message": "Chert Data Collection API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Project Management Endpoints
@app.get("/projects", response_model=List[ProjectResponse])
async def get_projects():
    """Get all projects"""
    try:
        projects = await supabase_client.get_projects()
        return projects
    except Exception as e:
        logger.error(f"Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """Get a specific project"""
    try:
        project = await supabase_client.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate):
    """Create a new project"""
    try:
        new_project = await supabase_client.create_project(project)
        return new_project
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project_data: Dict[str, Any]):
    """Update a project"""
    try:
        updated_project = await supabase_client.update_project(project_id, project_data)
        if not updated_project:
            raise HTTPException(status_code=404, detail="Project not found")
        return updated_project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    try:
        await supabase_client.delete_project(project_id)
        return {"message": "Project deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Data Recording Endpoints
@app.get("/projects/{project_id}/records", response_model=List[DataRecordResponse])
async def get_data_records(project_id: str):
    """Get data records for a project"""
    try:
        records = await supabase_client.get_data_records(project_id)
        return records
    except Exception as e:
        logger.error(f"Error fetching data records for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects/{project_id}/records", response_model=DataRecordResponse)
async def create_data_record(project_id: str, record: DataRecordCreate):
    """Create a new data record"""
    try:
        new_record = await supabase_client.create_data_record(project_id, record)
        return new_record
    except Exception as e:
        logger.error(f"Error creating data record: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Voice Processing Endpoints
@app.post("/voice/process", response_model=VoiceProcessingResponse)
async def process_voice_input(
    audio_file: UploadFile = File(...),
    project_id: str = Form(...),
    context: Optional[str] = Form(None)
):
    """Process voice input using the LangGraph agent"""
    try:
        # Save uploaded audio file temporarily with correct extension
        import tempfile
        
        # Get file extension from the uploaded file
        original_filename = audio_file.filename or "audio.wav"
        file_extension = os.path.splitext(original_filename)[1] or ".wav"
        
        # Ensure the extension is supported by OpenAI
        supported_extensions = ['.flac', '.m4a', '.mp3', '.mp4', '.mpeg', '.mpga', '.oga', '.ogg', '.wav', '.webm']
        if file_extension.lower() not in supported_extensions:
            file_extension = ".m4a"  # Default to m4a for mobile recordings
        
        temp_filename = f"temp_audio_{uuid.uuid4()}{file_extension}"
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, temp_filename)
        
        logger.info(f"Saving audio file as: {temp_filename} (original: {original_filename})")
        
        with open(temp_path, "wb") as buffer:
            content = await audio_file.read()
            buffer.write(content)
        
        logger.info(f"Audio file saved: {temp_path}, size: {len(content)} bytes")
        
        # Process with voice agent
        result = await voice_agent.process_voice_input(
            project_id=project_id,
            audio_file_path=temp_path,
            context=context
        )
        
        # Clean up temp file
        try:
            os.remove(temp_path)
        except OSError:
            pass  # File might already be removed
        
        return result
    except Exception as e:
        logger.error(f"Error processing voice input: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/text/process", response_model=VoiceProcessingResponse)
async def process_text_input(
    text: str = Form(...),
    project_id: str = Form(...),
    context: Optional[str] = Form(None)
):
    """Process text input using the LangGraph agent"""
    try:
        logger.info(f"Processing text input for project {project_id}: {text}")
        
        # Process with voice agent (reusing the voice agent's text processing capability)
        result = await voice_agent._process_text_input(text, context)
        
        logger.info(f"Text processing completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Error processing text input: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    """Transcribe audio to text"""
    try:
        # Save uploaded audio file temporarily with correct extension
        import tempfile
        
        # Get file extension from the uploaded file
        original_filename = audio_file.filename or "audio.wav"
        file_extension = os.path.splitext(original_filename)[1] or ".wav"
        
        # Ensure the extension is supported by OpenAI
        supported_extensions = ['.flac', '.m4a', '.mp3', '.mp4', '.mpeg', '.mpga', '.oga', '.ogg', '.wav', '.webm']
        if file_extension.lower() not in supported_extensions:
            file_extension = ".m4a"  # Default to m4a for mobile recordings
        
        temp_filename = f"temp_audio_{uuid.uuid4()}{file_extension}"
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, temp_filename)
        
        logger.info(f"Saving audio file for transcription as: {temp_filename}")
        
        with open(temp_path, "wb") as buffer:
            content = await audio_file.read()
            buffer.write(content)
        
        # Transcribe with OpenAI Whisper
        transcription = await voice_agent.transcribe_audio(temp_path)
        
        # Clean up temp file
        try:
            os.remove(temp_path)
        except OSError:
            pass  # File might already be removed
        
        return {"transcription": transcription}
    except Exception as e:
        logger.error(f"Error transcribing audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Image Processing Endpoints
@app.post("/image/process")
async def process_image_input(
    image_file: UploadFile = File(...),
    project_id: str = Form(...),
    context: Optional[str] = Form(None)
):
    """Process image input with computer vision"""
    try:
        # Save uploaded image file temporarily
        temp_filename = f"temp_image_{uuid.uuid4()}.jpg"
        temp_path = f"/tmp/{temp_filename}"
        
        with open(temp_path, "wb") as buffer:
            content = await image_file.read()
            buffer.write(content)
        
        # Process with voice agent
        result = await voice_agent.process_image_input(
            project_id=project_id,
            image_file_path=temp_path,
            context=context
        )
        
        # Clean up temp file
        os.remove(temp_path)
        
        return result
    except Exception as e:
        logger.error(f"Error processing image input: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Database Schema Endpoints
@app.get("/projects/{project_id}/schema", response_model=SchemaAnalysisResponse)
async def get_project_schema(project_id: str):
    """Get database schema for a project"""
    try:
        schema = await supabase_client.get_project_schema(project_id)
        return schema
    except Exception as e:
        logger.error(f"Error fetching schema for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/database/analyze")
async def analyze_database_schema(connection_string: str, database_type: str):
    """Analyze external database schema"""
    try:
        analysis = await supabase_client.analyze_external_database(
            connection_string, database_type
        )
        return analysis
    except Exception as e:
        logger.error(f"Error analyzing database: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Activity and Audit Endpoints
@app.get("/projects/{project_id}/activity")
async def get_project_activity(project_id: str, limit: int = 10):
    """Get recent activity for a project"""
    try:
        activity = await supabase_client.get_project_activity(project_id, limit)
        return activity
    except Exception as e:
        logger.error(f"Error fetching activity for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/audit/{commit_id}")
async def get_audit_details(commit_id: str):
    """Get detailed audit information for a commit"""
    try:
        audit = await supabase_client.get_audit_details(commit_id)
        if not audit:
            raise HTTPException(status_code=404, detail="Audit record not found")
        return audit
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching audit details for {commit_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/audit/{commit_id}/rollback")
async def rollback_commit(commit_id: str):
    """Rollback a specific commit"""
    try:
        result = await supabase_client.rollback_commit(commit_id)
        return result
    except Exception as e:
        logger.error(f"Error rolling back commit {commit_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "true").lower() == "true"
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )
