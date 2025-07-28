-- Chert Archaeological Database Schema
-- Run this SQL in your Supabase SQL Editor to create all necessary tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    documentation TEXT,
    database_type TEXT DEFAULT 'postgresql',
    connection_string TEXT,
    schema JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data records table for storing archaeological finds
CREATE TABLE IF NOT EXISTS data_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    table_name TEXT DEFAULT 'samples',
    data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    confidence FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs for tracking user actions
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log for rollback functionality
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commit_id UUID DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    affected_records TEXT[] DEFAULT '{}',
    data_diff JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID,
    rollback_id UUID
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_data_records_project_id ON data_records(project_id);
CREATE INDEX IF NOT EXISTS idx_data_records_table_name ON data_records(table_name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_project_id ON audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_commit_id ON audit_log(commit_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);

-- Add some helpful comments
COMMENT ON TABLE projects IS 'Archaeological excavation projects';
COMMENT ON TABLE data_records IS 'Individual artifact and feature records';
COMMENT ON TABLE activity_logs IS 'User activity tracking';
COMMENT ON TABLE audit_log IS 'Change tracking for rollback functionality';

COMMENT ON COLUMN data_records.data IS 'JSON object containing artifact/feature data';
COMMENT ON COLUMN data_records.metadata IS 'Recording method, GPS, confidence, etc.';
COMMENT ON COLUMN audit_log.affected_records IS 'Array of record IDs affected by this change';
COMMENT ON COLUMN audit_log.data_diff IS 'The actual changes made';

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (you can make this more restrictive)
CREATE POLICY "Allow all for authenticated users" ON projects
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all for authenticated users" ON data_records
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all for authenticated users" ON activity_logs
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all for authenticated users" ON audit_log
    FOR ALL TO authenticated USING (true);

-- Allow service role to do everything
CREATE POLICY "Allow all for service role" ON projects
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow all for service role" ON data_records
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow all for service role" ON activity_logs
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow all for service role" ON audit_log
    FOR ALL TO service_role USING (true);
