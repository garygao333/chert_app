# Database Schema Integration

This document describes the enhanced database schema functionality that retrieves real-time schema information from Supabase instead of using static SQL files.

## Features

### 1. Dynamic Schema Retrieval
The app now dynamically retrieves database schema information directly from the connected Supabase database using the `information_schema` tables.

### 2. Real-time Data Integration
- **Project Statistics**: Shows actual record counts and last activity timestamps from the database
- **Data Logs**: Displays real data records with pagination, search, and filtering
- **Database Schema**: Shows live database structure with table statistics
- **Schema Configuration**: Allows users to modify and update database schemas

### 3. New Screens

#### Data Logs Screen (`DataLogsScreen.tsx`)
- Displays all data records for a project
- Includes pagination (20 records per page)
- Search functionality across record data
- Shows confidence scores and recording methods
- Allows deletion of records with confirmation
- Real-time refresh capability

#### Database Schema Screen (`DatabaseSchemaScreen.tsx`)
- Shows actual database tables and columns
- Displays table statistics (row count, size, etc.)
- Expandable table views with column details
- Shows data types, required fields, and relationships
- Links to schema configuration

#### Data Schema Configuration Screen (`DataSchemaConfigScreen.tsx`)
- Allows adding/editing/deleting tables
- Column management with type selection
- Relationship configuration
- Real-time schema updates
- Validation and error handling

## Database Functions

The following SQL functions have been added to support schema introspection:

### `get_database_tables()`
Returns all user tables in the current schema, excluding system tables.

### `get_table_columns(table_name)`
Returns detailed column information for a specific table including:
- Column name and data type
- Nullable constraints
- Default values
- Comments

### `get_foreign_keys()`
Returns foreign key relationships between tables.

### `get_table_stats(table_name)`
Returns table statistics including:
- Row count
- Table size
- Index size
- Total size

## Enhanced SupabaseService Methods

### New Methods
- `getActualDatabaseSchema(projectId)`: Retrieves live schema from database
- `getDatabaseInfo(projectId)`: Gets schema and statistics
- `getTableStats(projectId, tableName)`: Gets statistics for a specific table
- `getDataRecords(projectId, limit, offset)`: Paginated data records
- `createDataRecord(...)`: Creates new data records
- `deleteDataRecord(recordId, projectId)`: Deletes data records

### Updated Methods
- `getProjectStats(projectId)`: Now returns real data counts
- `getRecentActivity(limit, projectId)`: Filters by project
- `logActivity(...)`: Uses actual user ID from authentication

## Navigation

The app navigation has been updated to include the new screens:
- `DataLogs`: Data logs screen
- `DatabaseSchema`: Database schema view
- `DataSchemaConfig`: Schema configuration

## Setup Instructions

1. **Run Schema Functions**: Execute the SQL in `backend/schema_introspection.sql` in your Supabase SQL editor to create the necessary functions.

2. **Permissions**: The functions are granted to authenticated users automatically.

3. **RLS Policies**: The existing Row Level Security policies ensure users can only access their own project data.

## Usage

### Viewing Project Data
1. Navigate to a project from the Projects screen
2. Use the action buttons to access:
   - **Data Logs**: View all recorded data
   - **Database Schema**: See the actual database structure
   - **Data Schema Config**: Modify the schema

### Managing Data Records
- View records with confidence scores and metadata
- Search across all record data
- Delete individual records
- See recording method (voice, image, manual)

### Schema Management
- View live database structure
- See table statistics and relationships
- Add/edit tables and columns
- Configure field types and validation
- Set up table relationships

## Benefits

1. **Real-time Data**: Always shows current database state
2. **No Static Files**: No need to maintain separate schema files
3. **Live Statistics**: Accurate counts and metrics
4. **User Management**: Proper authentication integration
5. **Scalability**: Works with any database size
6. **Flexibility**: Supports multiple database types in the future

## Future Enhancements

- Support for other database types (MySQL, PostgreSQL, etc.)
- Advanced relationship type detection
- Schema diff and migration tools
- Data validation based on schema
- Export/import functionality
