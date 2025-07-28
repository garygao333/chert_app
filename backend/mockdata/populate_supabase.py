#!/usr/bin/env python3
"""
Supabase Mock Data Populator

This script creates the necessary tables and populates them with archaeological mock data.
Run this script to set up your Supabase database with sample data for testing the voice agent.
"""

import os
import sys
import asyncio
import uuid
from datetime import datetime, timedelta
from pathlib import Path
import logging

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SupabaseMockDataPopulator:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.url or not self.service_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")
        
        self.client: Client = create_client(self.url, self.service_key)
        logger.info(f"Connected to Supabase at {self.url}")

    def create_tables(self):
        """Create the necessary tables using Supabase SQL"""
        
        # Projects table
        projects_sql = """
        CREATE TABLE IF NOT EXISTS projects (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT,
            documentation TEXT,
            database_type TEXT DEFAULT 'postgresql',
            connection_string TEXT,
            schema JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
        
        # Data records table
        data_records_sql = """
        CREATE TABLE IF NOT EXISTS data_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
            table_name TEXT DEFAULT 'samples',
            data JSONB NOT NULL,
            metadata JSONB DEFAULT '{}',
            confidence FLOAT DEFAULT 0.0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
        
        # Activity logs table
        activity_logs_sql = """
        CREATE TABLE IF NOT EXISTS activity_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
            action TEXT NOT NULL,
            description TEXT,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
        
        # Audit log table
        audit_log_sql = """
        CREATE TABLE IF NOT EXISTS audit_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            commit_id UUID DEFAULT gen_random_uuid(),
            project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
            action TEXT NOT NULL,
            affected_records TEXT[] DEFAULT '{}',
            data_diff JSONB DEFAULT '{}',
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            user_id UUID,
            rollback_id UUID
        );
        """
        
        # Indexes for better performance
        indexes_sql = """
        CREATE INDEX IF NOT EXISTS idx_data_records_project_id ON data_records(project_id);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON activity_logs(project_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_project_id ON audit_log(project_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_commit_id ON audit_log(commit_id);
        """
        
        sql_commands = [
            projects_sql,
            data_records_sql,
            activity_logs_sql,
            audit_log_sql,
            indexes_sql
        ]
        
        try:
            for sql in sql_commands:
                result = self.client.rpc('exec_sql', {'sql': sql}).execute()
                logger.info(f"Executed SQL command successfully")
        except Exception as e:
            logger.warning(f"SQL execution failed (this is normal if using direct table operations): {e}")
            logger.info("Continuing with table creation using insert operations...")

    def create_mock_projects(self):
        """Create mock archaeological projects"""
        
        projects_data = [
            {
                'id': str(uuid.uuid4()),
                'name': 'Tharros Excavation 2025',
                'description': 'Archaeological excavation of the ancient Phoenician-Roman city of Tharros, Sardinia',
                'documentation': '''
# Tharros Excavation Project 2025

## Overview
The Tharros excavation is investigating the ancient Phoenician-Roman settlement on the Sinis Peninsula, Sardinia. The site contains multiple occupation phases from the 8th century BCE to the Byzantine period.

## Research Objectives
- Document Phoenician settlement patterns
- Analyze Roman urban development
- Study material culture transitions
- Create comprehensive site database

## Methodology
- Stratigraphic excavation by context
- Digital recording of all finds
- 3D photogrammetry of features
- Comprehensive artifact analysis

## Current Areas
- Area A: Phoenician levels (Sectors 1-5)
- Area B: Roman forum complex
- Area C: Late antique structures
                ''',
                'database_type': 'postgresql',
                'connection_string': os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/tharros"),
                'schema': {
                    "tables": [
                        {
                            "name": "samples",
                            "columns": [
                                {"name": "id", "type": "uuid", "primary_key": True},
                                {"name": "artifact_type", "type": "text"},
                                {"name": "material", "type": "text"},
                                {"name": "dimensions", "type": "text"},
                                {"name": "weight", "type": "float"},
                                {"name": "context", "type": "text"},
                                {"name": "period", "type": "text"},
                                {"name": "description", "type": "text"}
                            ]
                        }
                    ]
                },
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Monte Sirai Survey',
                'description': 'Landscape archaeology survey of the Monte Sirai Phoenician settlement',
                'documentation': '''
# Monte Sirai Archaeological Survey

## Project Goals
- Map settlement boundaries
- Identify activity areas
- Document defensive structures
- Analyze landscape use

## Survey Methodology
- Systematic surface collection
- GPS mapping of features
- Drone photography
- Ground-penetrating radar
                ''',
                'database_type': 'postgresql',
                'connection_string': os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/montesirai"),
                'created_at': (datetime.now() - timedelta(days=30)).isoformat(),
                'updated_at': (datetime.now() - timedelta(days=5)).isoformat()
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Nuraghe Santu Antine',
                'description': 'Documentation and analysis of Bronze Age nuragic architecture',
                'documentation': '''
# Nuraghe Santu Antine Documentation Project

## Objectives
- 3D documentation of nuragic structures
- Architectural analysis
- Dating of construction phases
- Cultural material study

## Methods
- Laser scanning
- Photogrammetry
- Stratigraphic analysis
- Ceramic typology
                ''',
                'database_type': 'postgresql',
                'connection_string': os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/nuraghe"),
                'created_at': (datetime.now() - timedelta(days=60)).isoformat(),
                'updated_at': (datetime.now() - timedelta(days=10)).isoformat()
            }
        ]
        
        try:
            response = self.client.table('projects').insert(projects_data).execute()
            logger.info(f"Created {len(projects_data)} mock projects")
            return [p['id'] for p in projects_data]
        except Exception as e:
            logger.error(f"Error creating projects: {e}")
            return []

    def create_mock_data_records(self, project_ids):
        """Create mock archaeological data records"""
        
        # Sample artifact types with realistic data
        artifact_samples = [
            # Pottery
            {
                'artifact_type': 'Ceramic Bowl',
                'material': 'Terracotta',
                'dimensions': '18cm diameter, 8cm height',
                'weight': 245.5,
                'context': 'Area A, Context 1025',
                'period': 'Phoenician (7th-6th century BCE)',
                'description': 'Red-slip bowl with painted geometric decoration',
                'color': 'Red-brown',
                'condition': 'Fragmentary, 60% preserved',
                'surface_treatment': 'Red slip, painted',
                'confidence': 0.92
            },
            {
                'artifact_type': 'Storage Jar',
                'material': 'Coarse ceramic',
                'dimensions': '35cm height, 22cm max diameter',
                'weight': 1850.0,
                'context': 'Area B, Context 2045',
                'period': 'Roman (1st-2nd century CE)',
                'description': 'Large storage vessel with rope-impressed handles',
                'color': 'Buff',
                'condition': 'Nearly complete',
                'surface_treatment': 'Unslipped',
                'confidence': 0.89
            },
            {
                'artifact_type': 'Oil Lamp',
                'material': 'Fine ceramic',
                'dimensions': '8cm length, 6cm width',
                'weight': 85.2,
                'context': 'Area A, Context 1087',
                'period': 'Late Roman (3rd-4th century CE)',
                'description': 'Mold-made lamp with Christian symbols',
                'color': 'Orange-red',
                'condition': 'Complete',
                'surface_treatment': 'Orange slip',
                'confidence': 0.95
            },
            # Lithics
            {
                'artifact_type': 'Obsidian Blade',
                'material': 'Obsidian',
                'dimensions': '4.2cm length, 1.1cm width, 0.3cm thickness',
                'weight': 2.8,
                'context': 'Area C, Context 3012',
                'period': 'Neolithic',
                'description': 'Pressure-flaked blade with use-wear on edges',
                'color': 'Black',
                'condition': 'Complete',
                'source': 'Monte Arci',
                'confidence': 0.88
            },
            {
                'artifact_type': 'Grinding Stone',
                'material': 'Basalt',
                'dimensions': '25cm length, 15cm width, 8cm thickness',
                'weight': 2150.0,
                'context': 'Area B, Context 2023',
                'period': 'Bronze Age',
                'description': 'Saddle quern fragment with use-wear',
                'color': 'Dark gray',
                'condition': 'Fragmentary',
                'confidence': 0.91
            },
            # Metal objects
            {
                'artifact_type': 'Bronze Fibula',
                'material': 'Bronze',
                'dimensions': '5.5cm length, 2cm width',
                'weight': 12.4,
                'context': 'Area A, Context 1056',
                'period': 'Phoenician (6th century BCE)',
                'description': 'Serpentine fibula with incised decoration',
                'color': 'Green patina',
                'condition': 'Complete',
                'decoration': 'Incised lines',
                'confidence': 0.94
            },
            {
                'artifact_type': 'Iron Knife',
                'material': 'Iron',
                'dimensions': '12cm length, 2.5cm width',
                'weight': 45.8,
                'context': 'Area B, Context 2067',
                'period': 'Roman (2nd century CE)',
                'description': 'Single-edged knife with tang for handle',
                'color': 'Rust-brown',
                'condition': 'Corroded but complete',
                'confidence': 0.87
            },
            # Bone and organic
            {
                'artifact_type': 'Animal Bone',
                'material': 'Bone (sheep/goat)',
                'dimensions': '8.5cm length',
                'weight': 25.6,
                'context': 'Area A, Context 1034',
                'period': 'Phoenician',
                'description': 'Sheep/goat tibia with cut marks',
                'color': 'Cream',
                'condition': 'Good preservation',
                'species': 'Ovis/Capra',
                'butchery': 'Cut marks present',
                'confidence': 0.85
            }
        ]
        
        # Generate data records for each project
        all_records = []
        
        for project_id in project_ids:
            # Create 20-30 records per project
            import random
            num_records = random.randint(20, 30)
            
            for i in range(num_records):
                # Randomly select and modify a base artifact
                base_artifact = random.choice(artifact_samples).copy()
                
                # Add some variation
                base_artifact['find_number'] = f"SF{random.randint(1000, 9999)}"
                base_artifact['excavator'] = random.choice(['Dr. Smith', 'Prof. Jones', 'Dr. Garcia', 'Prof. Wilson'])
                base_artifact['date_found'] = (datetime.now() - timedelta(days=random.randint(1, 90))).strftime('%Y-%m-%d')
                
                # Vary some measurements slightly
                if 'weight' in base_artifact:
                    variation = random.uniform(0.9, 1.1)
                    base_artifact['weight'] = round(base_artifact['weight'] * variation, 1)
                
                record = {
                    'id': str(uuid.uuid4()),
                    'project_id': project_id,
                    'table_name': 'samples',
                    'data': base_artifact,
                    'metadata': {
                        'recording_method': random.choice(['voice', 'manual', 'image']),
                        'confidence': base_artifact.get('confidence', 0.85),
                        'gps_coordinates': {
                            'latitude': 39.9 + random.uniform(-0.1, 0.1),
                            'longitude': 8.5 + random.uniform(-0.1, 0.1)
                        },
                        'photo_urls': [f"https://example.com/photos/{uuid.uuid4()}.jpg"],
                        'notes': 'Recorded during systematic excavation'
                    },
                    'confidence': base_artifact.get('confidence', 0.85),
                    'created_at': (datetime.now() - timedelta(days=random.randint(1, 60))).isoformat(),
                    'updated_at': datetime.now().isoformat()
                }
                
                all_records.append(record)
        
        try:
            # Insert in batches to avoid overwhelming the database
            batch_size = 20
            for i in range(0, len(all_records), batch_size):
                batch = all_records[i:i + batch_size]
                response = self.client.table('data_records').insert(batch).execute()
                logger.info(f"Inserted batch {i//batch_size + 1} with {len(batch)} records")
            
            logger.info(f"Created {len(all_records)} total data records")
            return len(all_records)
        except Exception as e:
            logger.error(f"Error creating data records: {e}")
            return 0

    def create_mock_activity_logs(self, project_ids):
        """Create mock activity logs"""
        
        activities = []
        activity_types = [
            ('create', 'Created new data record'),
            ('update', 'Updated artifact classification'),
            ('delete', 'Removed duplicate record'),
            ('commit', 'Voice agent batch commit'),
            ('rollback', 'Rolled back erroneous data'),
            ('export', 'Exported data for analysis'),
            ('import', 'Imported legacy data'),
            ('validate', 'Validated data quality')
        ]
        
        for project_id in project_ids:
            # Create 10-15 activity logs per project
            import random
            num_activities = random.randint(10, 15)
            
            for i in range(num_activities):
                action, base_description = random.choice(activity_types)
                
                activity = {
                    'id': str(uuid.uuid4()),
                    'project_id': project_id,
                    'action': action,
                    'description': f"{base_description} - {random.choice(['Area A', 'Area B', 'Area C'])}",
                    'metadata': {
                        'user': random.choice(['archaeologist_1', 'field_assistant_2', 'voice_agent']),
                        'duration_seconds': random.randint(30, 300),
                        'confidence': random.uniform(0.8, 0.95) if action == 'commit' else None
                    },
                    'created_at': (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat()
                }
                
                activities.append(activity)
        
        try:
            response = self.client.table('activity_logs').insert(activities).execute()
            logger.info(f"Created {len(activities)} activity logs")
            return len(activities)
        except Exception as e:
            logger.error(f"Error creating activity logs: {e}")
            return 0

    def create_mock_audit_logs(self, project_ids):
        """Create mock audit logs for rollback testing"""
        
        audit_logs = []
        
        for project_id in project_ids:
            # Create a few audit logs per project
            import random
            num_audits = random.randint(3, 6)
            
            for i in range(num_audits):
                commit_id = str(uuid.uuid4())
                
                audit = {
                    'id': str(uuid.uuid4()),
                    'commit_id': commit_id,
                    'project_id': project_id,
                    'action': random.choice(['bulk_insert', 'voice_commit', 'manual_entry', 'data_import']),
                    'affected_records': [str(uuid.uuid4()) for _ in range(random.randint(1, 5))],
                    'data_diff': {
                        'operation': 'insert',
                        'table': 'samples',
                        'count': random.randint(1, 5),
                        'summary': 'Archaeological artifacts recorded via voice agent'
                    },
                    'timestamp': (datetime.now() - timedelta(days=random.randint(1, 20))).isoformat(),
                    'user_id': str(uuid.uuid4())
                }
                
                audit_logs.append(audit)
        
        try:
            response = self.client.table('audit_log').insert(audit_logs).execute()
            logger.info(f"Created {len(audit_logs)} audit log entries")
            return len(audit_logs)
        except Exception as e:
            logger.error(f"Error creating audit logs: {e}")
            return 0

    def verify_data(self):
        """Verify that data was created successfully"""
        
        try:
            # Check projects
            projects = self.client.table('projects').select('id, name').execute()
            logger.info(f"✅ Found {len(projects.data)} projects in database")
            
            # Check data records
            records = self.client.table('data_records').select('id, project_id').execute()
            logger.info(f"✅ Found {len(records.data)} data records in database")
            
            # Check activity logs
            activities = self.client.table('activity_logs').select('id').execute()
            logger.info(f"✅ Found {len(activities.data)} activity logs in database")
            
            # Check audit logs
            audits = self.client.table('audit_log').select('id').execute()
            logger.info(f"✅ Found {len(audits.data)} audit log entries in database")
            
            # Show sample data
            if projects.data:
                logger.info(f"\n📋 Sample Projects:")
                for project in projects.data[:3]:
                    logger.info(f"  - {project['name']} (ID: {project['id'][:8]}...)")
            
            if records.data:
                sample_record = self.client.table('data_records').select('data').limit(1).execute()
                if sample_record.data:
                    artifact = sample_record.data[0]['data']
                    logger.info(f"\n🏺 Sample Artifact: {artifact.get('artifact_type', 'Unknown')} - {artifact.get('description', 'No description')}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error verifying data: {e}")
            return False

    def run(self):
        """Run the complete mock data population"""
        
        logger.info("🚀 Starting Supabase mock data population...")
        
        try:
            # Step 1: Create tables
            logger.info("📋 Creating database tables...")
            self.create_tables()
            
            # Step 2: Create projects
            logger.info("🏛️ Creating mock projects...")
            project_ids = self.create_mock_projects()
            
            if not project_ids:
                logger.error("❌ Failed to create projects. Stopping.")
                return False
            
            # Step 3: Create data records
            logger.info("🏺 Creating mock archaeological data...")
            records_count = self.create_mock_data_records(project_ids)
            
            # Step 4: Create activity logs
            logger.info("📝 Creating activity logs...")
            activities_count = self.create_mock_activity_logs(project_ids)
            
            # Step 5: Create audit logs
            logger.info("🔍 Creating audit logs...")
            audits_count = self.create_mock_audit_logs(project_ids)
            
            # Step 6: Verify everything
            logger.info("✅ Verifying data creation...")
            success = self.verify_data()
            
            if success:
                logger.info("\n🎉 Mock data population completed successfully!")
                logger.info(f"📊 Summary:")
                logger.info(f"   - Projects: {len(project_ids)}")
                logger.info(f"   - Data Records: {records_count}")
                logger.info(f"   - Activity Logs: {activities_count}")
                logger.info(f"   - Audit Logs: {audits_count}")
                logger.info(f"\n🔗 Supabase URL: {self.url}")
                logger.info(f"💡 You can now test the voice agent with real data!")
                return True
            else:
                logger.error("❌ Data verification failed")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error during population: {e}")
            return False

def main():
    """Main entry point"""
    
    print("🏺 Chert Archaeological Database Mock Data Populator")
    print("=" * 50)
    
    try:
        populator = SupabaseMockDataPopulator()
        success = populator.run()
        
        if success:
            print("\n✅ Success! Your Supabase database is now populated with archaeological mock data.")
            print("🎤 You can now test the voice agent with: python test_integration.py")
            print("🚀 Or start the server with: python start.py")
        else:
            print("\n❌ Failed to populate database. Check the logs above for details.")
            return 1
            
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
