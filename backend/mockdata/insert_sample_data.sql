-- Sample Archaeological Data for Chert Database
-- Run this SQL after creating the tables to populate with test data

-- Insert sample projects
INSERT INTO projects (id, name, description, documentation, database_type, connection_string, schema, created_at, updated_at)
VALUES 
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Tharros Excavation 2025',
    'Archaeological excavation of the ancient Phoenician-Roman city of Tharros, Sardinia',
    '# Tharros Excavation Project 2025

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
- Area C: Late antique structures',
    'postgresql',
    'postgresql://user:pass@localhost:5432/tharros',
    '{"tables": [{"name": "samples", "columns": [{"name": "id", "type": "uuid", "primary_key": true}, {"name": "artifact_type", "type": "text"}, {"name": "material", "type": "text"}, {"name": "dimensions", "type": "text"}, {"name": "weight", "type": "float"}, {"name": "context", "type": "text"}, {"name": "period", "type": "text"}, {"name": "description", "type": "text"}]}]}',
    NOW(),
    NOW()
),
(
    'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    'Monte Sirai Survey',
    'Landscape archaeology survey of the Monte Sirai Phoenician settlement',
    '# Monte Sirai Archaeological Survey

## Project Goals
- Map settlement boundaries
- Identify activity areas
- Document defensive structures
- Analyze landscape use

## Survey Methodology
- Systematic surface collection
- GPS mapping of features
- Drone photography
- Ground-penetrating radar',
    'postgresql',
    'postgresql://user:pass@localhost:5432/montesirai',
    '{}',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '5 days'
),
(
    'c3d4e5f6-a7b8-9012-cdef-34567890123a',
    'Nuraghe Santu Antine',
    'Documentation and analysis of Bronze Age nuragic architecture',
    '# Nuraghe Santu Antine Documentation Project

## Objectives
- 3D documentation of nuragic structures
- Architectural analysis
- Dating of construction phases
- Cultural material study

## Methods
- Laser scanning
- Photogrammetry
- Stratigraphic analysis
- Ceramic typology',
    'postgresql',
    'postgresql://user:pass@localhost:5432/nuraghe',
    '{}',
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '10 days'
);

-- Insert sample data records
INSERT INTO data_records (id, project_id, table_name, data, metadata, confidence, created_at, updated_at)
VALUES 
(
    'd4e5f6a7-b8c9-0123-defa-456789012345',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'samples',
    '{
        "artifact_type": "Ceramic Bowl",
        "material": "Terracotta", 
        "dimensions": "18cm diameter, 8cm height",
        "weight": 245.5,
        "context": "Area A, Context 1025",
        "period": "Phoenician (7th-6th century BCE)",
        "description": "Red-slip bowl with painted geometric decoration",
        "color": "Red-brown",
        "condition": "Fragmentary, 60% preserved",
        "surface_treatment": "Red slip, painted",
        "find_number": "SF1234",
        "excavator": "Dr. Smith",
        "date_found": "2025-07-20"
    }',
    '{
        "recording_method": "voice",
        "confidence": 0.92,
        "gps_coordinates": {"latitude": 39.905, "longitude": 8.532},
        "photo_urls": ["https://example.com/photos/bowl_1234.jpg"],
        "notes": "Recorded during systematic excavation of Area A"
    }',
    0.92,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
),
(
    'e5f6a7b8-c9d0-1234-efab-56789012345b',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'samples',
    '{
        "artifact_type": "Storage Jar",
        "material": "Coarse ceramic",
        "dimensions": "35cm height, 22cm max diameter", 
        "weight": 1850.0,
        "context": "Area B, Context 2045",
        "period": "Roman (1st-2nd century CE)",
        "description": "Large storage vessel with rope-impressed handles",
        "color": "Buff",
        "condition": "Nearly complete",
        "surface_treatment": "Unslipped",
        "find_number": "SF1235",
        "excavator": "Prof. Jones",
        "date_found": "2025-07-18"
    }',
    '{
        "recording_method": "manual",
        "confidence": 0.89,
        "gps_coordinates": {"latitude": 39.907, "longitude": 8.534},
        "photo_urls": ["https://example.com/photos/jar_1235.jpg"],
        "notes": "Found in storage room context"
    }',
    0.89,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days'
),
(
    'f6a7b8c9-d0e1-2345-fabc-6789012345cd',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'samples',
    '{
        "artifact_type": "Oil Lamp",
        "material": "Fine ceramic",
        "dimensions": "8cm length, 6cm width",
        "weight": 85.2,
        "context": "Area A, Context 1087", 
        "period": "Late Roman (3rd-4th century CE)",
        "description": "Mold-made lamp with Christian symbols",
        "color": "Orange-red",
        "condition": "Complete",
        "surface_treatment": "Orange slip",
        "find_number": "SF1236",
        "excavator": "Dr. Garcia",
        "date_found": "2025-07-15"
    }',
    '{
        "recording_method": "image",
        "confidence": 0.95,
        "gps_coordinates": {"latitude": 39.904, "longitude": 8.531},
        "photo_urls": ["https://example.com/photos/lamp_1236.jpg"],
        "notes": "Excellent preservation, complete iconography"
    }',
    0.95,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
),
(
    'a7b8c9d0-e1f2-3456-abcd-789012345def',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'samples',
    '{
        "artifact_type": "Obsidian Blade",
        "material": "Obsidian",
        "dimensions": "4.2cm length, 1.1cm width, 0.3cm thickness",
        "weight": 2.8,
        "context": "Area C, Context 3012",
        "period": "Neolithic",
        "description": "Pressure-flaked blade with use-wear on edges",
        "color": "Black",
        "condition": "Complete",
        "source": "Monte Arci",
        "find_number": "SF1237",
        "excavator": "Prof. Wilson",
        "date_found": "2025-07-12"
    }',
    '{
        "recording_method": "voice",
        "confidence": 0.88,
        "gps_coordinates": {"latitude": 39.903, "longitude": 8.529},
        "photo_urls": ["https://example.com/photos/blade_1237.jpg"],
        "notes": "Prehistoric find in sealed context"
    }',
    0.88,
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '12 days'
),
(
    'b8c9d0e1-f2a3-4567-bcde-89012345ef01',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'samples',
    '{
        "artifact_type": "Bronze Fibula",
        "material": "Bronze",
        "dimensions": "5.5cm length, 2cm width",
        "weight": 12.4,
        "context": "Area A, Context 1056",
        "period": "Phoenician (6th century BCE)",
        "description": "Serpentine fibula with incised decoration",
        "color": "Green patina",
        "condition": "Complete",
        "decoration": "Incised lines",
        "find_number": "SF1238",
        "excavator": "Dr. Smith",
        "date_found": "2025-07-08"
    }',
    '{
        "recording_method": "manual",
        "confidence": 0.94,
        "gps_coordinates": {"latitude": 39.906, "longitude": 8.533},
        "photo_urls": ["https://example.com/photos/fibula_1238.jpg"],
        "notes": "Rare complete fibula, excellent craftsmanship"
    }',
    0.94,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
);

-- Insert activity logs
INSERT INTO activity_logs (id, project_id, action, description, metadata, created_at)
VALUES 
(
    'c9d0e1f2-a3b4-5678-cdef-9012345f0123',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'create',
    'Created new ceramic bowl record via voice input',
    '{"user": "archaeologist_1", "duration_seconds": 120, "confidence": 0.92}',
    NOW() - INTERVAL '5 days'
),
(
    'd0e1f2a3-b4c5-6789-def0-012345a01234',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'commit',
    'Voice agent batch commit of 3 artifacts',
    '{"user": "voice_agent", "duration_seconds": 45, "confidence": 0.89}',
    NOW() - INTERVAL '3 days'
),
(
    'e1f2a3b4-c5d6-7890-ef01-123456b12345',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'update',
    'Updated artifact classification based on specialist review',
    '{"user": "specialist_1", "duration_seconds": 180}',
    NOW() - INTERVAL '1 day'
);

-- Insert audit log entries
INSERT INTO audit_log (id, commit_id, project_id, action, affected_records, data_diff, timestamp, user_id)
VALUES 
(
    'f2a3b4c5-d6e7-8901-f012-23456c123456',
    'a3b4c5d6-e7f8-9012-f123-3456d1234567',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'bulk_insert',
    ARRAY['d4e5f6a7-b8c9-0123-defa-456789012345', 'e5f6a7b8-c9d0-1234-efab-56789012345b'],
    '{
        "operation": "insert",
        "table": "samples", 
        "count": 2,
        "summary": "Archaeological artifacts recorded via voice agent",
        "artifacts": ["Ceramic Bowl", "Storage Jar"]
    }',
    NOW() - INTERVAL '5 days',
    'b4c5d6e7-f8a9-0123-b456-456e12345678'
),
(
    'a5b6c7d8-e9f0-1234-a567-567f12345678',
    'b6c7d8e9-f0a1-2345-b678-678a12345679',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'voice_commit',
    ARRAY['f6a7b8c9-d0e1-2345-fabc-6789012345cd'],
    '{
        "operation": "insert",
        "table": "samples",
        "count": 1,
        "summary": "Oil lamp recorded via voice workflow",
        "confidence": 0.95
    }',
    NOW() - INTERVAL '10 days',
    'c7d8e9f0-a1b2-3456-c789-789b12345680'
);
