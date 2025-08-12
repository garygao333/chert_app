#!/usr/bin/env python3
import os
import sys
import asyncio
from dotenv import load_dotenv

# Add the backend directory to the path
sys.path.append('/Users/garygao/Desktop/chertapp/backend')

from supabase_client import SupabaseClient

async def clear_samples():
    """Clear all samples from the database to remove old mock data"""
    try:
        load_dotenv()
        client = SupabaseClient()
        await client.initialize()
        
        print('Checking samples table...')
        
        # Get current samples
        response = client.supabase.table('samples').select('id, data, metadata').limit(10).execute()
        samples = response.data
        
        print(f'Found {len(samples)} samples in database')
        
        if len(samples) > 0:
            # Show sample structure
            for i, sample in enumerate(samples[:2]):
                print(f'Sample {i+1} ID: {sample.get("id", "N/A")}')
                if 'data' in sample and sample['data']:
                    data_fields = list(sample["data"].keys()) if isinstance(sample["data"], dict) else str(type(sample["data"]))
                    print(f'  Data fields: {data_fields}')
                if 'metadata' in sample and sample['metadata']:
                    metadata_fields = list(sample["metadata"].keys()) if isinstance(sample["metadata"], dict) else str(type(sample["metadata"]))
                    print(f'  Metadata fields: {metadata_fields}')
            
            # Clear all samples
            print(f'Clearing {len(samples)} samples from database...')
            delete_response = client.supabase.table('samples').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
            print('✅ Samples cleared successfully')
            
            # Verify clearing
            verify_response = client.supabase.table('samples').select('id').execute()
            remaining = len(verify_response.data)
            print(f'Verification: {remaining} samples remaining')
        else:
            print('No samples to clear')
            
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(clear_samples())