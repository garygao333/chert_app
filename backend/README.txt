Chert Backend API Documentation
=============================

Overview
--------
This is the backend API for the Chert application, an AI-powered data collection system designed for archaeological field work. The backend provides RESTful endpoints for voice processing, image analysis, and data management.

Key Features
------------
- Voice command processing with AI assistance
- Image capture and artifact detection
- Structured data storage and management
- Project management system
- Activity logging and auditing

File Structure
-------------

__init__.py
------------
- Package initialization
- Exports main components (app, VoiceAgent, SupabaseClient)
- Defines package version and author information

main.py
--------
- FastAPI application setup
- CORS configuration
- API endpoint definitions
- Service initialization
- Error handling middleware

voice_agent.py
--------------
- Implements the voice processing agent
- Handles voice command interpretation
- Manages workflow planning
- Integrates with AI models
- Processes voice recordings

supabase_client.py
------------------
- Database client implementation
- Manages Supabase connections
- Handles CRUD operations
- Implements schema management
- Manages data validation

models.py
---------
- Defines Pydantic models for data validation
- Implements database schemas
- Defines response structures
- Manages type definitions

start.py
--------
- Startup script
- Installs dependencies
- Checks environment configuration
- Starts the FastAPI server

schema.sql
----------
- Database schema definitions
- Table structures
- Indexes and constraints

setup_database.py
-----------------
- Database initialization script
- Schema setup
- Initial data population

requirements.txt
----------------
- Lists Python dependencies
- Version specifications
- Development requirements

mockdata/
---------
- Contains sample data for testing
- Mock responses for API endpoints
- Test data configurations

Development Setup
----------------
1. Create a virtual environment:
   python -m venv venv
   source venv/bin/activate  # On macOS/Linux

2. Install dependencies:
   pip install -r requirements.txt

3. Configure environment variables:
   - SUPABASE_URL
   - SUPABASE_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - OPENAI_API_KEY

4. Start the server:
   python start.py

The backend uses FastAPI for the web framework, Supabase for data storage, and integrates with OpenAI for AI processing capabilities. All endpoints are documented using FastAPI's auto-generated API documentation available at /docs when the server is running.
