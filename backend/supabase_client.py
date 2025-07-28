from supabase import create_client, Client
from typing import List, Dict, Any, Optional
import os
import logging
import uuid
from datetime import datetime
import json
from models import (
    ProjectCreate, ProjectResponse, DataRecordCreate, DataRecordResponse,
    ActivityLog, AuditRecord, SchemaAnalysisResponse, DatabaseSchema,
    TableSchema, ColumnSchema
)

logger = logging.getLogger(__name__)

class SupabaseClient:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.client: Optional[Client] = None
        self.service_client: Optional[Client] = None

    async def initialize(self):
        """Initialize Supabase clients"""
        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
        
        self.client = create_client(self.url, self.key)
        
        if self.service_key:
            self.service_client = create_client(self.url, self.service_key)
        else:
            self.service_client = self.client
            logger.warning("Service role key not provided, using anon key for admin operations")

    def _ensure_client(self):
        """Ensure client is initialized"""
        if not self.client:
            raise RuntimeError("Supabase client not initialized. Call initialize() first.")

    def _is_valid_uuid(self, uuid_string: str) -> bool:
        """Check if a string is a valid UUID"""
        try:
            uuid.UUID(uuid_string)
            return True
        except ValueError:
            return False

    # Project Management
    async def get_projects(self) -> List[ProjectResponse]:
        """Get all projects"""
        self._ensure_client()
        
        try:
            response = self.client.table('projects').select('*').execute()
            
            projects = []
            for data in response.data:
                project = ProjectResponse(
                    id=data['id'],
                    name=data['name'],
                    description=data['description'],
                    documentation=data['documentation'],
                    database_type=data['database_type'],
                    connection_string=data['connection_string'],
                    created_at=datetime.fromisoformat(data['created_at'].replace('Z', '+00:00')),
                    updated_at=datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00')),
                    schema=data.get('schema')
                )
                projects.append(project)
            
            return projects
        except Exception as e:
            logger.error(f"Error fetching projects: {e}")
            raise

    async def get_project(self, project_id: str) -> Optional[ProjectResponse]:
        """Get a specific project"""
        self._ensure_client()
        
        try:
            # Validate UUID format first
            if not self._is_valid_uuid(project_id):
                logger.warning(f"Invalid UUID format for project_id: {project_id}")
                return None
                
            response = self.client.table('projects').select('*').eq('id', project_id).execute()
            
            if not response.data:
                return None
            
            data = response.data[0]
            return ProjectResponse(
                id=data['id'],
                name=data['name'],
                description=data['description'],
                documentation=data['documentation'],
                database_type=data['database_type'],
                connection_string=data['connection_string'],
                created_at=datetime.fromisoformat(data['created_at'].replace('Z', '+00:00')),
                updated_at=datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00')),
                schema=data.get('schema')
            )
        except Exception as e:
            logger.error(f"Error fetching project {project_id}: {e}")
            return None  # Return None instead of raising to handle gracefully

    async def create_project(self, project: ProjectCreate) -> ProjectResponse:
        """Create a new project"""
        self._ensure_client()
        
        try:
            project_data = {
                'id': str(uuid.uuid4()),
                'name': project.name,
                'description': project.description,
                'documentation': project.documentation,
                'database_type': project.database_type.value,
                'connection_string': project.connection_string,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            response = self.client.table('projects').insert(project_data).execute()
            
            if not response.data:
                raise RuntimeError("Failed to create project")
            
            data = response.data[0]
            
            # Log activity
            await self._log_activity(
                project_id=data['id'],
                action='create',
                description=f"Created project '{project.name}'"
            )
            
            return ProjectResponse(
                id=data['id'],
                name=data['name'],
                description=data['description'],
                documentation=data['documentation'],
                database_type=data['database_type'],
                connection_string=data['connection_string'],
                created_at=datetime.fromisoformat(data['created_at'].replace('Z', '+00:00')),
                updated_at=datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00')),
                schema=data.get('schema')
            )
        except Exception as e:
            logger.error(f"Error creating project: {e}")
            raise

    async def update_project(self, project_id: str, updates: Dict[str, Any]) -> Optional[ProjectResponse]:
        """Update a project"""
        self._ensure_client()
        
        try:
            updates['updated_at'] = datetime.now().isoformat()
            
            response = self.client.table('projects').update(updates).eq('id', project_id).execute()
            
            if not response.data:
                return None
            
            data = response.data[0]
            
            # Log activity
            await self._log_activity(
                project_id=project_id,
                action='update',
                description=f"Updated project '{data['name']}'"
            )
            
            return ProjectResponse(
                id=data['id'],
                name=data['name'],
                description=data['description'],
                documentation=data['documentation'],
                database_type=data['database_type'],
                connection_string=data['connection_string'],
                created_at=datetime.fromisoformat(data['created_at'].replace('Z', '+00:00')),
                updated_at=datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00')),
                schema=data.get('schema')
            )
        except Exception as e:
            logger.error(f"Error updating project {project_id}: {e}")
            raise

    async def delete_project(self, project_id: str):
        """Delete a project"""
        self._ensure_client()
        
        try:
            # Get project name for logging
            project = await self.get_project(project_id)
            project_name = project.name if project else project_id
            
            # Delete related data first
            self.client.table('data_records').delete().eq('project_id', project_id).execute()
            self.client.table('activity_logs').delete().eq('project_id', project_id).execute()
            
            # Delete project
            response = self.client.table('projects').delete().eq('id', project_id).execute()
            
            logger.info(f"Deleted project '{project_name}' and all related data")
        except Exception as e:
            logger.error(f"Error deleting project {project_id}: {e}")
            raise

    # Data Records
    async def get_data_records(self, project_id: str) -> List[DataRecordResponse]:
        """Get data records for a project"""
        self._ensure_client()
        
        try:
            response = self.client.table('data_records').select('*').eq('project_id', project_id).execute()
            
            records = []
            for data in response.data:
                record = DataRecordResponse(
                    id=data['id'],
                    project_id=data['project_id'],
                    table_name=data['table_name'],
                    data=data['data'],
                    metadata=data['metadata'],
                    confidence=data['confidence'],
                    created_at=datetime.fromisoformat(data['created_at'].replace('Z', '+00:00')),
                    updated_at=datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00'))
                )
                records.append(record)
            
            return records
        except Exception as e:
            logger.error(f"Error fetching data records for project {project_id}: {e}")
            raise

    async def create_data_record(self, project_id: str, record: DataRecordCreate) -> DataRecordResponse:
        """Create a new data record"""
        self._ensure_client()
        
        try:
            record_data = {
                'id': str(uuid.uuid4()),
                'project_id': project_id,
                'table_name': record.table_name,
                'data': record.data,
                'metadata': record.metadata.dict(),
                'confidence': record.metadata.confidence or 0.0,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            response = self.client.table('data_records').insert(record_data).execute()
            
            if not response.data:
                raise RuntimeError("Failed to create data record")
            
            data = response.data[0]
            
            # Log activity
            await self._log_activity(
                project_id=project_id,
                action='create',
                description=f"Added data record to table '{record.table_name}'"
            )
            
            return DataRecordResponse(
                id=data['id'],
                project_id=data['project_id'],
                table_name=data['table_name'],
                data=data['data'],
                metadata=data['metadata'],
                confidence=data['confidence'],
                created_at=datetime.fromisoformat(data['created_at'].replace('Z', '+00:00')),
                updated_at=datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00'))
            )
        except Exception as e:
            logger.error(f"Error creating data record: {e}")
            raise

    # Batch operations for the voice agent
    async def write_batch_records(self, project_id: str, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Write multiple records as a batch (for voice agent)"""
        self._ensure_client()
        
        try:
            commit_id = str(uuid.uuid4())
            timestamp = datetime.now()
            
            # Prepare record data
            record_data = []
            for record in records:
                record_data.append({
                    'id': str(uuid.uuid4()),
                    'project_id': project_id,
                    'table_name': record.get('table_name', 'samples'),
                    'data': record,
                    'metadata': {
                        'recording_method': 'voice',
                        'confidence': record.get('confidence', 0.0),
                        'reasoning': record.get('reasoning', '')
                    },
                    'confidence': record.get('confidence', 0.0),
                    'created_at': timestamp.isoformat(),
                    'updated_at': timestamp.isoformat()
                })
            
            # Insert records
            response = self.client.table('data_records').insert(record_data).execute()
            
            if not response.data:
                raise RuntimeError("Failed to insert batch records")
            
            inserted_records = response.data
            row_ids = [r['id'] for r in inserted_records]
            
            # Create audit record
            audit_data = {
                'id': commit_id,
                'timestamp': timestamp.isoformat(),
                'project_id': project_id,
                'rows': row_ids,
                'diff': records,
                'reasoning': f"Voice agent batch insert of {len(records)} records"
            }
            
            self.client.table('audit_log').insert(audit_data).execute()
            
            # Log activity
            await self._log_activity(
                project_id=project_id,
                action='commit',
                description=f"Voice agent committed {len(records)} records"
            )
            
            return {
                'commit_id': commit_id,
                'row_ids': row_ids,
                'records_count': len(records)
            }
        except Exception as e:
            logger.error(f"Error writing batch records: {e}")
            raise

    async def get_sample_rows(self, project_id: str, table_name: str = 'samples', limit: int = 5) -> List[Dict[str, Any]]:
        """Get sample rows for few-shot learning"""
        self._ensure_client()
        
        try:
            response = (self.client.table('data_records')
                       .select('data')
                       .eq('project_id', project_id)
                       .eq('table_name', table_name)
                       .limit(limit)
                       .execute())
            
            return [row['data'] for row in response.data]
        except Exception as e:
            logger.error(f"Error fetching sample rows: {e}")
            return []

    # Schema Management
    async def get_project_schema(self, project_id: str) -> SchemaAnalysisResponse:
        """Get cached schema for a project"""
        try:
            project = await self.get_project(project_id)
            
            if not project or not project.schema:
                logger.info(f"No project found or no schema for project {project_id}, using default schema")
                # Return default schema for demo
                return self._get_default_schema()
            
            return SchemaAnalysisResponse(**project.schema)
        except Exception as e:
            logger.error(f"Error getting project schema for {project_id}: {e}")
            # Return default schema as fallback
            return self._get_default_schema()

    def _get_default_schema(self) -> SchemaAnalysisResponse:
        """Return default demo schema"""
        return SchemaAnalysisResponse(
            schema=DatabaseSchema(
                tables=[
                    TableSchema(
                        name="samples",
                        columns=[
                            ColumnSchema(name="id", type="uuid", required=True),
                            ColumnSchema(name="class", type="text", required=True),
                            ColumnSchema(name="weight", type="float", required=False),
                            ColumnSchema(name="dimensions", type="text", required=False),
                            ColumnSchema(name="color", type="text", required=False),
                            ColumnSchema(name="material", type="text", required=False),
                            ColumnSchema(name="location", type="text", required=False),
                            ColumnSchema(name="image_url", type="text", required=False),
                            ColumnSchema(name="created_at", type="timestamptz", required=True)
                        ]
                    )
                ]
            ),
            suggestions=[
                "Consider adding GPS coordinates field",
                "Recommend standardized color classification", 
                "Add confidence scoring for identifications"
            ],
            confidence=0.95
        )

    async def analyze_external_database(self, connection_string: str, database_type: str) -> Dict[str, Any]:
        """Analyze external database schema (placeholder implementation)"""
        # TODO: Implement actual database introspection
        # This would connect to the external database and analyze its schema
        
        return {
            "schema": self._get_default_schema().dict(),
            "analysis": "External database analysis not yet implemented",
            "recommendations": [
                "Set up foreign data wrapper for external tables",
                "Create views for commonly accessed data",
                "Establish data synchronization strategy"
            ]
        }

    # Activity and Audit
    async def _log_activity(self, project_id: str, action: str, description: str, metadata: Optional[Dict[str, Any]] = None):
        """Log activity for a project"""
        try:
            activity_data = {
                'id': str(uuid.uuid4()),
                'project_id': project_id,
                'action': action,
                'description': description,
                'metadata': metadata or {},
                'created_at': datetime.now().isoformat()
            }
            
            self.client.table('activity_logs').insert(activity_data).execute()
        except Exception as e:
            logger.error(f"Error logging activity: {e}")

    async def get_project_activity(self, project_id: str, limit: int = 10) -> List[ActivityLog]:
        """Get recent activity for a project"""
        self._ensure_client()
        
        try:
            response = (self.client.table('activity_logs')
                       .select('*, projects(name)')
                       .eq('project_id', project_id)
                       .order('created_at', desc=True)
                       .limit(limit)
                       .execute())
            
            activities = []
            for data in response.data:
                activity = ActivityLog(
                    id=data['id'],
                    type=data['action'],
                    description=data['description'],
                    project_id=data['project_id'],
                    project_name=data['projects']['name'] if data.get('projects') else 'Unknown',
                    timestamp=datetime.fromisoformat(data['created_at'].replace('Z', '+00:00')),
                    metadata=data.get('metadata')
                )
                activities.append(activity)
            
            return activities
        except Exception as e:
            logger.error(f"Error fetching project activity: {e}")
            return []

    async def get_audit_details(self, commit_id: str) -> Optional[AuditRecord]:
        """Get audit details for a commit"""
        self._ensure_client()
        
        try:
            response = self.client.table('audit_log').select('*').eq('id', commit_id).execute()
            
            if not response.data:
                return None
            
            data = response.data[0]
            return AuditRecord(
                id=data['id'],
                timestamp=datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00')),
                project_id=data['project_id'],
                rows=data['rows'],
                diff=data['diff'],
                reasoning=data.get('reasoning')
            )
        except Exception as e:
            logger.error(f"Error fetching audit details for {commit_id}: {e}")
            return None

    async def rollback_commit(self, commit_id: str) -> Dict[str, Any]:
        """Rollback a specific commit"""
        self._ensure_client()
        
        try:
            audit = await self.get_audit_details(commit_id)
            if not audit:
                raise ValueError(f"Audit record {commit_id} not found")
            
            # Delete the affected rows
            for row_id in audit.rows:
                self.client.table('data_records').delete().eq('id', row_id).execute()
            
            # Log the rollback
            await self._log_activity(
                project_id=audit.project_id,
                action='rollback',
                description=f"Rolled back commit {commit_id[:8]}",
                metadata={'original_commit': commit_id, 'rows_removed': len(audit.rows)}
            )
            
            return {
                'success': True,
                'commit_id': commit_id,
                'rows_removed': len(audit.rows),
                'message': f"Successfully rolled back {len(audit.rows)} records"
            }
        except Exception as e:
            logger.error(f"Error rolling back commit {commit_id}: {e}")
            raise

    async def analyze_schema(self, project_id: str) -> SchemaAnalysisResponse:
        """Analyze database schema for a project"""
        self._ensure_client()
        
        try:
            # For now, return a hardcoded schema
            # In production, this would introspect the actual connected database
            schema = DatabaseSchema(
                tables=[
                    TableSchema(
                        name="samples",
                        columns=[
                            ColumnSchema(name="id", type="uuid", primary_key=True),
                            ColumnSchema(name="project_id", type="uuid", foreign_key="projects.id"),
                            ColumnSchema(name="artifact_type", type="text"),
                            ColumnSchema(name="description", type="text"),
                            ColumnSchema(name="weight", type="float"),
                            ColumnSchema(name="dimensions", type="text"),
                            ColumnSchema(name="material", type="text"),
                            ColumnSchema(name="context", type="text"),
                            ColumnSchema(name="image_url", type="text"),
                            ColumnSchema(name="created_at", type="timestamptz"),
                        ],
                        description="Archaeological artifact samples"
                    ),
                    TableSchema(
                        name="features",
                        columns=[
                            ColumnSchema(name="id", type="uuid", primary_key=True),
                            ColumnSchema(name="project_id", type="uuid", foreign_key="projects.id"),
                            ColumnSchema(name="feature_type", type="text"),
                            ColumnSchema(name="description", type="text"),
                            ColumnSchema(name="location", type="jsonb"),
                            ColumnSchema(name="dimensions", type="text"),
                            ColumnSchema(name="created_at", type="timestamptz"),
                        ],
                        description="Archaeological features and contexts"
                    )
                ],
                relationships=[
                    {"from": "samples.project_id", "to": "projects.id", "type": "many_to_one"},
                    {"from": "features.project_id", "to": "projects.id", "type": "many_to_one"}
                ]
            )
            
            suggestions = [
                "Use 'artifact_type' field for pottery, lithics, bones, etc.",
                "Include weight in grams for quantitative analysis",
                "Add GPS coordinates in 'location' field",
                "Use consistent measurement units",
                "Reference feature contexts when recording artifacts"
            ]
            
            return SchemaAnalysisResponse(
                schema=schema,
                suggestions=suggestions,
                confidence=0.95
            )
            
        except Exception as e:
            logger.error(f"Error analyzing schema: {e}")
            raise

    async def create_audit_record(self, audit_data: Dict[str, Any]) -> AuditRecord:
        """Create an audit record for tracking changes"""
        self._ensure_client()
        
        try:
            audit_record = {
                "id": str(uuid.uuid4()),
                "commit_id": audit_data["commit_id"],
                "project_id": audit_data["project_id"],
                "action": audit_data["action"],
                "affected_records": audit_data["affected_records"],
                "data_diff": audit_data["data_diff"],
                "timestamp": audit_data["timestamp"].isoformat(),
                "user_id": audit_data.get("user_id"),
                "rollback_id": audit_data.get("rollback_id")
            }
            
            response = self.client.table('audit_log').insert(audit_record).execute()
            
            if not response.data:
                raise RuntimeError("Failed to create audit record")
                
            data = response.data[0]
            
            return AuditRecord(
                id=data["id"],
                commit_id=data["commit_id"],
                project_id=data["project_id"],
                action=data["action"],
                affected_records=data["affected_records"],
                data_diff=data["data_diff"],
                timestamp=datetime.fromisoformat(data["timestamp"].replace('Z', '+00:00')),
                user_id=data.get("user_id"),
                rollback_id=data.get("rollback_id")
            )
            
        except Exception as e:
            logger.error(f"Error creating audit record: {e}")
            raise
