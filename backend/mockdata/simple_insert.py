#!/usr/bin/env python3
"""
Simple Supabase Data Inserter

This script only inserts data into existing tables. Use this if you've already created
the tables manually in Supabase or if the main script fails on table creation.
"""

import os
import sys
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
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Simple data insertion"""
    
    # Initialize Supabase client
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not service_key:
        logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file")
        return 1
    
    client = create_client(url, service_key)
    logger.info(f"Connected to Supabase at {url}")
    
    try:
        # 1. Create a single test project
        project_data = {
            'id': str(uuid.uuid4()),
            'name': 'Tharros Test Project',
            'description': 'Test archaeological project for voice agent',
            'documentation': 'Test project created by mock data script',
            'database_type': 'postgresql',
            'connection_string': 'test_connection',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        project_response = client.table('projects').insert([project_data]).execute()
        project_id = project_data['id']
        logger.info(f"✅ Created test project: {project_data['name']}")
        
        # 2. Create sample data records
        sample_artifacts = [
            {
                'id': str(uuid.uuid4()),
                'project_id': project_id,
                'table_name': 'samples',
                'data': {
                    'artifact_type': 'Ceramic Bowl',
                    'material': 'Terracotta',
                    'weight': 245.5,
                    'dimensions': '18cm diameter',
                    'color': 'Red-brown',
                    'context': 'Area A, Context 1025',
                    'period': 'Phoenician',
                    'description': 'Red-slip bowl with painted decoration'
                },
                'metadata': {
                    'recording_method': 'voice',
                    'confidence': 0.92,
                    'gps_coordinates': {'latitude': 39.9, 'longitude': 8.5}
                },
                'confidence': 0.92,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            },
            {
                'id': str(uuid.uuid4()),
                'project_id': project_id,
                'table_name': 'samples',
                'data': {
                    'artifact_type': 'Storage Jar',
                    'material': 'Coarse ceramic',
                    'weight': 1850.0,
                    'dimensions': '35cm height',
                    'color': 'Buff',
                    'context': 'Area B, Context 2045',
                    'period': 'Roman',
                    'description': 'Large storage vessel with handles'
                },
                'metadata': {
                    'recording_method': 'manual',
                    'confidence': 0.89
                },
                'confidence': 0.89,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            },
            {
                'id': str(uuid.uuid4()),
                'project_id': project_id,
                'table_name': 'samples',
                'data': {
                    'artifact_type': 'Obsidian Blade',
                    'material': 'Obsidian',
                    'weight': 2.8,
                    'dimensions': '4.2cm length',
                    'color': 'Black',
                    'context': 'Area C, Context 3012',
                    'period': 'Neolithic',
                    'description': 'Pressure-flaked blade with use-wear'
                },
                'metadata': {
                    'recording_method': 'image',
                    'confidence': 0.88
                },
                'confidence': 0.88,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
        ]
        
        records_response = client.table('data_records').insert(sample_artifacts).execute()
        logger.info(f"✅ Created {len(sample_artifacts)} sample data records")
        
        # 3. Create an activity log entry
        activity_data = {
            'id': str(uuid.uuid4()),
            'project_id': project_id,
            'action': 'create',
            'description': 'Created test project with sample data',
            'metadata': {'source': 'mock_data_script'},
            'created_at': datetime.now().isoformat()
        }
        
        activity_response = client.table('activity_logs').insert([activity_data]).execute()
        logger.info("✅ Created activity log entry")
        
        # 4. Create an audit log entry
        audit_data = {
            'id': str(uuid.uuid4()),
            'commit_id': str(uuid.uuid4()),
            'project_id': project_id,
            'action': 'bulk_insert',
            'affected_records': [r['id'] for r in sample_artifacts],
            'data_diff': {'operation': 'insert', 'count': len(sample_artifacts)},
            'timestamp': datetime.now().isoformat()
        }
        
        audit_response = client.table('audit_log').insert([audit_data]).execute()
        logger.info("✅ Created audit log entry")
        
        # 5. Verify data
        projects = client.table('projects').select('*').execute()
        records = client.table('data_records').select('*').execute()
        
        logger.info(f"\n📊 Final Summary:")
        logger.info(f"   Projects: {len(projects.data)}")
        logger.info(f"   Data Records: {len(records.data)}")
        logger.info(f"   Project ID: {project_id}")
        
        logger.info(f"\n🎉 Success! Your database now has test data.")
        logger.info(f"🔗 Supabase URL: {url}")
        
        return 0
        
    except Exception as e:
        logger.error(f"❌ Error inserting data: {e}")
        logger.info("💡 Make sure your tables exist in Supabase:")
        logger.info("   - projects")
        logger.info("   - data_records") 
        logger.info("   - activity_logs")
        logger.info("   - audit_log")
        return 1

if __name__ == "__main__":
    print("🏺 Simple Supabase Data Inserter")
    print("=" * 40)
    exit(main())
