# Mock Data Setup for Chert Archaeological Database

This folder contains scripts to populate your Supabase database with archaeological test data.

## 🚀 Quick Setup

### Option 1: Run SQL Scripts Directly in Supabase (Recommended)

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Click on "SQL Editor"

2. **Create Tables**
   - Copy and paste the contents of `create_tables.sql`
   - Click "Run" to create all necessary tables

3. **Insert Sample Data**
   - Copy and paste the contents of `insert_sample_data.sql`
   - Click "Run" to populate with archaeological test data

### Option 2: Use Python Scripts

1. **Install Dependencies**
   ```bash
   cd backend
   pip install supabase python-dotenv
   ```

2. **Run Full Population Script**
   ```bash
   python mockdata/populate_supabase.py
   ```

3. **Or Run Simple Insert Script**
   ```bash
   python mockdata/simple_insert.py
   ```

## 📋 What Gets Created

### Tables
- **projects** - Archaeological excavation projects
- **data_records** - Individual artifact and feature records
- **activity_logs** - User activity tracking
- **audit_log** - Change tracking for rollback functionality

### Sample Data
- **3 Archaeological Projects**:
  - Tharros Excavation 2025 (Phoenician-Roman site)
  - Monte Sirai Survey (Phoenician settlement)
  - Nuraghe Santu Antine (Bronze Age architecture)

- **5+ Artifact Records**:
  - Ceramic Bowl (Phoenician, red-slip)
  - Storage Jar (Roman, coarse ceramic)
  - Oil Lamp (Late Roman, with Christian symbols)
  - Obsidian Blade (Neolithic, Monte Arci source)
  - Bronze Fibula (Phoenician, serpentine type)

- **Activity Logs** - Recent user actions and voice agent commits
- **Audit Logs** - Change tracking for rollback testing

## 🔍 Verification

After running the scripts, verify your data:

1. **Check in Supabase Dashboard**:
   - Go to "Table Editor"
   - Browse the `projects`, `data_records`, `activity_logs`, and `audit_log` tables

2. **Test with API**:
   ```bash
   # From backend directory
   python test_integration.py
   ```

3. **Start the Server**:
   ```bash
   python start.py
   ```
   Then visit http://localhost:8000/projects to see your projects

## 🎯 Sample Project IDs

The sample data includes these project IDs you can use for testing:

- **Tharros Project**: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- **Monte Sirai**: `b2c3d4e5-f6g7-8901-bcde-f23456789012`
- **Nuraghe Santu Antine**: `c3d4e5f6-g7h8-9012-cdef-34567890123a`

## 🎤 Testing the Voice Agent

Once data is loaded, you can test the voice agent:

1. **Start the backend server**:
   ```bash
   python start.py
   ```

2. **Test voice processing** (replace with actual audio file):
   ```bash
   curl -X POST "http://localhost:8000/voice/process" \
     -F "audio_file=@test_audio.wav" \
     -F "project_id=a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   ```

3. **Test project retrieval**:
   ```bash
   curl "http://localhost:8000/projects"
   ```

## 🛠️ Troubleshooting

### "Table already exists" errors
- This is normal if you've run the scripts before
- The scripts use `IF NOT EXISTS` to avoid conflicts

### "Permission denied" errors
- Make sure you're using the Service Role Key in your `.env` file
- Check that Row Level Security policies allow your operations

### "Connection failed" errors
- Verify your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- Make sure your Supabase project is active

### Missing data after running scripts
- Check the Supabase logs in your dashboard
- Verify the SQL ran without errors
- Try the simple insert script instead

## 🧹 Cleanup

To remove all test data:

```sql
-- Run in Supabase SQL Editor
DELETE FROM audit_log;
DELETE FROM activity_logs;
DELETE FROM data_records;
DELETE FROM projects;
```

Or to drop all tables:

```sql
-- Run in Supabase SQL Editor  
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS data_records CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
```

## 📊 Sample Queries

Test your data with these SQL queries in Supabase:

```sql
-- Count records by project
SELECT p.name, COUNT(dr.id) as record_count
FROM projects p
LEFT JOIN data_records dr ON p.id = dr.project_id
GROUP BY p.id, p.name;

-- Show recent activity
SELECT al.action, al.description, al.created_at, p.name as project_name
FROM activity_logs al
JOIN projects p ON al.project_id = p.id
ORDER BY al.created_at DESC
LIMIT 10;

-- Show artifacts by type
SELECT 
    data->>'artifact_type' as artifact_type,
    COUNT(*) as count,
    AVG(confidence) as avg_confidence
FROM data_records
WHERE table_name = 'samples'
GROUP BY data->>'artifact_type'
ORDER BY count DESC;
```

## 🎉 Ready to Go!

Once your data is loaded, your Chert voice agent backend is ready for testing with realistic archaeological data. The sample includes various artifact types, recording methods, and metadata that mirror real archaeological documentation workflows.

Happy excavating! 🏺
