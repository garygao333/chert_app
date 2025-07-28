#!/usr/bin/env python3
"""
Test script for the LangGraph Voice Agent implementation
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from voice_agent import VoiceAgent
from supabase_client import SupabaseClient
from models import VoiceProcessingResponse

async def test_voice_agent():
    """Test the voice agent functionality"""
    
    print("🔧 Testing Voice Agent Integration...")
    
    # Initialize clients
    supabase_client = SupabaseClient()
    await supabase_client.initialize()
    
    voice_agent = VoiceAgent(supabase_client)
    
    print("✅ Voice agent initialized successfully")
    
    # Test transcription (mock)
    print("\n🎤 Testing audio transcription...")
    
    # For testing, we'll mock the audio file path
    test_transcription = await voice_agent.simple_transcribe("test_audio.wav")
    print(f"📝 Transcription result: {test_transcription}")
    
    # Test the full workflow with a mock audio input
    print("\n🤖 Testing full voice processing workflow...")
    
    try:
        # This would normally be a real audio file
        # For testing, the agent will handle the missing file gracefully
        result = await voice_agent.process_voice_input(
            project_id="test-project-123",
            audio_file_path="mock_audio.wav",
            context="Testing archaeological data collection"
        )
        
        print(f"🎯 Processing result:")
        print(f"   Transcription: {result.transcription}")
        print(f"   Extracted Data: {result.extracted_data}")
        print(f"   Confidence: {result.confidence}")
        print(f"   Reasoning: {result.reasoning}")
        
        if result.workflow_plan:
            print(f"   Workflow Plan: {result.workflow_plan.get('summary', 'No summary')}")
            
    except Exception as e:
        print(f"❌ Error in voice processing: {e}")
    
    print("\n✅ Voice agent testing completed!")

async def test_supabase_connection():
    """Test Supabase connection"""
    
    print("\n🗄️  Testing Supabase connection...")
    
    try:
        supabase_client = SupabaseClient()
        await supabase_client.initialize()
        
        # Test schema analysis
        schema_response = await supabase_client.analyze_schema("test-project")
        print(f"📊 Schema analysis successful: {len(schema_response.schema.tables)} tables found")
        
        print("✅ Supabase connection successful")
        
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        print("   Make sure your .env file has valid Supabase credentials")

if __name__ == "__main__":
    print("🚀 Starting Chert Backend Tests...")
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Check if required environment variables are set
    required_vars = ["SUPABASE_URL", "SUPABASE_KEY", "OPENAI_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        print("   Please check your .env file")
        sys.exit(1)
    
    print("✅ Environment variables loaded")
    
    # Run tests
    asyncio.run(test_supabase_connection())
    asyncio.run(test_voice_agent())
    
    print("\n🎉 All tests completed!")
