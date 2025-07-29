#!/usr/bin/env python3
"""
Startup script for Chert Backend API

This script ensures all dependencies are installed and starts the FastAPI server.
"""

import subprocess
import sys
import os
from pathlib import Path

# def install_requirements():
#     """Install Python requirements"""
#     requirements_file = Path(__file__).parent / "requirements.txt"
    
#     if requirements_file.exists():
#         print("Installing Python dependencies...")
#         subprocess.check_call([
#             sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
#         ])
#     else:
#         print("Warning: requirements.txt not found")

def check_env_file():
    """Check if .env file exists and warn if not configured"""
    env_file = Path(__file__).parent / ".env"
    
    if not env_file.exists():
        print("Warning: .env file not found. Please create one based on the template.")
        return False
    
    # Check if critical environment variables are set
    with open(env_file, 'r') as f:
        content = f.read()
        
    required_vars = [
        'OPENAI_API_KEY',
        'SUPABASE_URL', 
        'SUPABASE_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        if f"{var}=your_" in content or f"{var}=" not in content:
            missing_vars.append(var)
    
    if missing_vars:
        print(f"Warning: The following environment variables need to be configured: {', '.join(missing_vars)}")
        print("Please update your .env file with the actual values.")
        return False
    
    return True

def start_server():
    """Start the FastAPI server"""
    print("Starting Chert Backend API server...")
    
    # Import uvicorn here so we can install requirements first
    import uvicorn
    
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "true").lower() == "true"
    
    print(f"Server will be available at: http://{host}:{port}")
    print("API documentation will be available at: http://localhost:8000/docs")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )

if __name__ == "__main__":
    print("=== Chert Backend API Startup ===")
    
    # Install dependencies
    #install_requirements()
    
    # Check environment configuration
    env_configured = check_env_file()
    
    if not env_configured:
        print("\nThe server will start, but some features may not work without proper configuration.")
        input("Press Enter to continue anyway, or Ctrl+C to exit and configure first...")
    
    # Start server
    start_server()
