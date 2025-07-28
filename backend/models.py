from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, Union, TypedDict
from datetime import datetime
from enum import Enum

class DatabaseType(str, Enum):
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    SQLITE = "sqlite"
    MSSQL = "mssql"

class RecordingMethod(str, Enum):
    VOICE = "voice"
    IMAGE = "image"
    MANUAL = "manual"

class ActivityType(str, Enum):
    COMMIT = "commit"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"

# Detection Model for Computer Vision
class Detection(BaseModel):
    bbox: List[float] = Field(..., description="Bounding box [x1, y1, x2, y2]")
    label: str = Field(..., description="Detected object label")
    confidence: float = Field(..., description="Confidence score")  # Use "confidence" consistently

# LangGraph State Model
class AgentState(TypedDict):
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

# Project Models
class ProjectBase(BaseModel):
    name: str = Field(..., description="Project name")
    description: str = Field(..., description="Project description")
    documentation: str = Field(..., description="Project documentation")
    database_type: DatabaseType = Field(..., description="Type of database")
    connection_string: str = Field(..., description="Database connection string")

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: str
    created_at: datetime
    updated_at: datetime
    schema: Optional[Dict[str, Any]] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    documentation: Optional[str] = None
    database_type: Optional[DatabaseType] = None
    connection_string: Optional[str] = None

# Data Record Models
class RecordMetadata(BaseModel):
    recording_method: RecordingMethod
    location: Optional[Dict[str, float]] = None  # {"latitude": float, "longitude": float}
    audio_file: Optional[str] = None
    image_files: Optional[List[str]] = None
    reasoning: Optional[str] = None
    user_feedback: Optional[str] = None
    confidence: Optional[float] = None

class DataRecordBase(BaseModel):
    table_name: str = Field(..., description="Database table name")
    data: Dict[str, Any] = Field(..., description="Record data")
    metadata: RecordMetadata = Field(..., description="Recording metadata")

class DataRecordCreate(DataRecordBase):
    pass

class DataRecordResponse(DataRecordBase):
    id: str
    project_id: str
    confidence: float
    created_at: datetime
    updated_at: datetime

# Voice Processing Models
class VoiceProcessingRequest(BaseModel):
    project_id: str
    context: Optional[str] = None

class VoiceProcessingResponse(BaseModel):
    transcription: str
    intent: Dict[str, Any]
    plan: Dict[str, Any]
    extracted_data: Dict[str, Any]
    confidence: float
    suggested_fields: List[str]
    detections: Optional[List[Detection]] = None
    commit_id: Optional[str] = None
    reasoning: str

# Schema Models
class ColumnSchema(BaseModel):
    name: str
    type: str
    required: bool
    description: Optional[str] = None

class TableSchema(BaseModel):
    name: str
    columns: List[ColumnSchema]

class DatabaseSchema(BaseModel):
    tables: List[TableSchema]
    relationships: Optional[List[Dict[str, Any]]] = None

# Activity Models
class ActivityLog(BaseModel):
    id: str
    type: ActivityType
    description: str
    project_id: str
    project_name: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None

# Audit Models
class AuditRecord(BaseModel):
    id: str
    timestamp: datetime
    project_id: str
    rows: List[str]  # List of row IDs affected
    diff: Dict[str, Any]  # The changes made
    user_id: Optional[str] = None
    reasoning: Optional[str] = None

# LangGraph State Models
class AgentState(BaseModel):
    messages: List[Dict[str, Any]] = []
    intent: Optional[Dict[str, Any]] = None
    plan: Optional[Dict[str, Any]] = None
    schema: Optional[Dict[str, Any]] = None
    thinking: Optional[str] = None
    tool_events: List[Dict[str, Any]] = []
    rows_pending: List[Dict[str, Any]] = []
    commit_ids: List[str] = []
    image_url: Optional[str] = None
    detections: List[Detection] = []
    project_id: Optional[str] = None
    user_feedback: Optional[str] = None

# Plan Templates
class PlanStep(BaseModel):
    type: str  # "ask", "tool", "confirm"
    action: Optional[str] = None  # "photo", "voice", "info"
    tool: Optional[str] = None  # Tool name
    args: Optional[Dict[str, Any]] = None
    prompt: Optional[str] = None

class WorkflowPlan(BaseModel):
    steps: List[PlanStep]
    description: str
    estimated_time: Optional[int] = None  # in minutes
    requires_user_input: bool = True

# Image Processing Models
class ImageProcessingResponse(BaseModel):
    description: str
    extracted_data: Dict[str, Any]
    confidence: float
    detections: List[Detection]

# Voice Processing Models
class VoiceProcessingRequest(BaseModel):
    audio_file_path: str
    project_id: str
    context: Optional[str] = None

class VoiceProcessingResponse(BaseModel):
    transcription: str
    extracted_data: Dict[str, Any]
    confidence: float
    suggested_fields: List[str]
    reasoning: str
    commit_id: Optional[str] = None
    workflow_plan: Optional[Dict[str, Any]] = None
    tool_events: Optional[List[Dict[str, Any]]] = None

# Schema Analysis Models
class ColumnSchema(BaseModel):
    name: str
    type: str
    nullable: bool = True
    primary_key: bool = False
    foreign_key: Optional[str] = None

class TableSchema(BaseModel):
    name: str
    columns: List[ColumnSchema]
    description: Optional[str] = None

class DatabaseSchema(BaseModel):
    tables: List[TableSchema]
    relationships: List[Dict[str, Any]] = []

class SchemaAnalysisResponse(BaseModel):
    schema: DatabaseSchema
    suggestions: List[str]
    confidence: float

# Audit and Activity Models
class ActivityLog(BaseModel):
    id: str
    project_id: str
    activity_type: ActivityType
    description: str
    timestamp: datetime
    user_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class AuditRecord(BaseModel):
    id: str
    commit_id: str
    project_id: str
    action: str
    affected_records: List[str]
    data_diff: Dict[str, Any]
    timestamp: datetime
    user_id: Optional[str] = None
    rollback_id: Optional[str] = None
