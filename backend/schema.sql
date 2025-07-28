-- Chert Database Schema for Supabase
-- Run this SQL in your Supabase SQL editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    documentation TEXT,
    database_type VARCHAR(50) NOT NULL,
    connection_string TEXT,
    schema JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Data records table
CREATE TABLE IF NOT EXISTS data_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    table_name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    confidence FLOAT DEFAULT 0.0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log table for rollback functionality
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rows TEXT[] NOT NULL, -- Array of affected row IDs
    diff JSONB NOT NULL, -- The changes made
    reasoning TEXT
);

-- Samples table (for demo/default schema)
CREATE TABLE IF NOT EXISTS samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class VARCHAR(255),
    weight FLOAT,
    dimensions VARCHAR(255),
    color VARCHAR(255),
    material VARCHAR(255),
    location VARCHAR(255),
    image_url TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    confidence FLOAT DEFAULT 0.0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_data_records_project_id ON data_records(project_id);
CREATE INDEX IF NOT EXISTS idx_data_records_created_at ON data_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_project_id ON audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_samples_project_id ON samples(project_id);

-- RLS (Row Level Security) policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects" ON projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
    FOR DELETE USING (auth.uid() = user_id);

-- Data records policies
CREATE POLICY "Users can view data records for their projects" ON data_records
    FOR SELECT USING (
        auth.uid() = user_id OR 
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create data records for their projects" ON data_records
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update data records for their projects" ON data_records
    FOR UPDATE USING (
        auth.uid() = user_id AND
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete data records for their projects" ON data_records
    FOR DELETE USING (
        auth.uid() = user_id AND
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- Activity logs policies
CREATE POLICY "Users can view activity for their projects" ON activity_logs
    FOR SELECT USING (
        auth.uid() = user_id OR
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create activity logs" ON activity_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Audit log policies
CREATE POLICY "Users can view audit logs for their projects" ON audit_log
    FOR SELECT USING (
        auth.uid() = user_id OR
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Service role can manage audit logs" ON audit_log
    FOR ALL USING (true);

-- Samples policies (for demo table)
CREATE POLICY "Users can view samples for their projects" ON samples
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create samples for their projects" ON samples
    FOR INSERT WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_records_updated_at BEFORE UPDATE ON data_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for demo
INSERT INTO projects (id, name, description, documentation, database_type, connection_string, user_id) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Tharros Project', 'Archaeological field data collection for Tharros excavation site', 'Detailed documentation for Tharros project...', 'postgresql', 'postgresql://demo', auth.uid())
ON CONFLICT (id) DO NOTHING;

INSERT INTO samples (id, class, weight, dimensions, color, material, project_id) VALUES
    (uuid_generate_v4(), 'rim', 12.5, '3cm diameter', 'red-brown', 'ceramic', '550e8400-e29b-41d4-a716-446655440000'),
    (uuid_generate_v4(), 'body', 8.2, '2x3cm', 'buff', 'ceramic', '550e8400-e29b-41d4-a716-446655440000'),
    (uuid_generate_v4(), 'base', 15.7, '4cm diameter', 'dark-grey', 'ceramic', '550e8400-e29b-41d4-a716-446655440000'),
    (uuid_generate_v4(), 'handle', 6.3, '1x4cm', 'orange', 'ceramic', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT DO NOTHING;
