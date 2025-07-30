#!/usr/bin/env python3
"""
Test script to verify the backend is accessible from mobile devices
"""
import requests
import sys

def test_backend_connection():
    """Test if the backend is accessible"""
    
    # Test localhost (for local development)
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend accessible via localhost:8000")
        else:
            print(f"❌ Backend localhost responded with status {response.status_code}")
    except Exception as e:
        print(f"❌ Cannot reach backend via localhost: {e}")
    
    # Test IP address (for mobile access)
    try:
        response = requests.get("http://10.31.49.23:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend accessible via IP address 10.31.49.23:8000")
            print("🚀 Mobile app should be able to connect!")
        else:
            print(f"❌ Backend IP responded with status {response.status_code}")
    except Exception as e:
        print(f"❌ Cannot reach backend via IP address: {e}")
        print("Make sure:")
        print("  1. Backend server is running")
        print("  2. Windows Firewall allows port 8000")
        print("  3. Your computer and mobile device are on the same network")

if __name__ == "__main__":
    print("Testing backend connectivity...")
    test_backend_connection()
