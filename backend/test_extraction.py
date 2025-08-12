#!/usr/bin/env python3

# Simple test to see what the LLM extraction returns with our fixes
import sys
import os
sys.path.append('/Users/garygao/Desktop/chertapp/backend')

def test_extraction():
    """Test the field extraction logic"""
    
    # Simulate what the LLM might return
    mock_llm_response = '{"notes": "I want to record a lobby that is 5kg and 5mm.", "weight": "5000"}'
    
    # Simulate the project schema
    mock_schema = {
        'dataColumns': ['Item ID', 'Location', 'Description', 'Measurement (mm)', 'Status', 'Notes'],
        'columnAnnotations': {
            'Location': 'Where the item was found',
            'Measurement (mm)': 'Size measurement in millimeters',
            'Notes': 'Additional notes'
        }
    }
    
    # Simulate the validation logic from voice_agent.py
    import json
    
    try:
        extracted_data = json.loads(mock_llm_response)
        print(f"LLM returned: {extracted_data}")
        
        # Get valid fields from schema
        valid_fields = mock_schema['dataColumns']
        print(f"Valid schema fields: {valid_fields}")
        
        # Create case-insensitive mapping
        valid_fields_lower = {field.lower(): field for field in valid_fields}
        print(f"Case-insensitive mapping: {valid_fields_lower}")
        
        # Validate fields
        filtered_data = {}
        for key, value in extracted_data.items():
            # Check exact match first
            if key in valid_fields:
                filtered_data[key] = value
                print(f"✅ Accepted field (exact match): {key} = {value}")
            # Check case-insensitive match
            elif key.lower() in valid_fields_lower:
                correct_field_name = valid_fields_lower[key.lower()]
                filtered_data[correct_field_name] = value
                print(f"✅ Accepted field (case-corrected): {key} -> {correct_field_name} = {value}")
            else:
                print(f"❌ REJECTED invalid field '{key}' (not in schema valid fields)")
        
        print(f"Final filtered data: {filtered_data}")
        
        # Test what CSV headers would be
        headers = set(['timestamp', 'confidence'])
        # Add schema columns
        for column in mock_schema['dataColumns']:
            headers.add(column)
        # Add actual data fields (this is what was causing the problem)
        for key in filtered_data.keys():
            headers.add(key)
        
        print(f"Resulting CSV headers: {sorted(list(headers))}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_extraction()