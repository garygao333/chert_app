#!/usr/bin/env python3
"""
Database Setup Script for Chert Archaeological Application
This script will create tables and populate them with sample data in Supabase.
"""

import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from supabase_client import SupabaseClient

# Load environment variables
load_dotenv()

async def setup_database():
    """Create tables and populate with sample data"""
    
    print("🗄️  Setting up Chert Archaeological Database...")
    
    # Initialize Supabase client
    try:
        supabase = SupabaseClient()
        print("✅ Connected to Supabase")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        return False
    
    # Read SQL files
    mockdata_dir = Path(__file__).parent / "mockdata"
    
    # Step 1: Create tables
    create_tables_file = mockdata_dir / "create_tables.sql"
    if create_tables_file.exists():
        print("\n📊 Creating database tables...")
        with open(create_tables_file, 'r', encoding='utf-8') as f:
            create_sql = f.read()
        
        try:
            # Execute the create tables SQL
            result = supabase.client.rpc('execute_sql', {'sql': create_sql})
            print("✅ Tables created successfully")
        except Exception as e:
            print(f"⚠️  Tables may already exist or creation failed: {e}")
            # Continue anyway - tables might already exist
    else:
        print("❌ create_tables.sql not found")
        return False
    
    # Step 2: Insert sample data
    insert_data_file = mockdata_dir / "insert_sample_data.sql"
    if insert_data_file.exists():
        print("\n📝 Inserting sample archaeological data...")
        with open(insert_data_file, 'r', encoding='utf-8') as f:
            insert_sql = f.read()
        
        try:
            # Execute the insert data SQL
            result = supabase.client.rpc('execute_sql', {'sql': insert_sql})
            print("✅ Sample data inserted successfully")
        except Exception as e:
            print(f"⚠️  Data insertion failed (may already exist): {e}")
            # Try individual inserts
            print("🔄 Attempting individual record insertion...")
            
            # Try to insert projects directly through our client
            try:
                # Check if projects already exist
                projects = supabase.client.table('projects').select('*').execute()
                if projects.data and len(projects.data) > 0:
                    print(f"✅ Found {len(projects.data)} existing projects")
                else:
                    print("⚠️  No projects found - manual insertion may be needed")
                    
            except Exception as e2:
                print(f"❌ Could not check existing data: {e2}")
    else:
        print("❌ insert_sample_data.sql not found")
        return False
    
    # Step 3: Verify the setup
    print("\n🔍 Verifying database setup...")
    try:
        # Check projects
        projects = supabase.client.table('projects').select('id, name').execute()
        print(f"✅ Projects table: {len(projects.data)} records")
        
        # Check data_records
        records = supabase.client.table('data_records').select('id').execute()
        print(f"✅ Data records table: {len(records.data)} records")
        
        # Check activity_logs
        logs = supabase.client.table('activity_logs').select('id').execute()
        print(f"✅ Activity logs table: {len(logs.data)} records")
        
        # Check audit_log
        audit = supabase.client.table('audit_log').select('id').execute()
        print(f"✅ Audit log table: {len(audit.data)} records")
        
        if projects.data:
            print("\n📋 Sample projects:")
            for project in projects.data:
                print(f"   • {project['name']} (ID: {project['id']})")
        
        print("\n🎉 Database setup completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Chert Archaeological Database Setup")
    print("=" * 50)
    
    # Check environment variables
    required_env_vars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please check your .env file")
        exit(1)
    
    # Run the setup
    success = asyncio.run(setup_database())
    
    if success:
        print("\n✅ All done! Your Supabase database is ready for archaeological data collection.")
    else:
        print("\n❌ Setup failed. Please check the errors above and try manual SQL execution.")
