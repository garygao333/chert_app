# Supabase Setup Instructions

## Quick Fix for Current Errors

The app is now updated to work without the custom SQL functions. It will:
- Use fallback database schema information
- Provide estimated table statistics
- Work with basic functionality until you set up the advanced features

## Setting Up Advanced Database Schema Functions (Optional)

To enable full schema introspection and real-time database statistics, follow these steps:

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to the "SQL Editor" tab in the left sidebar
3. Click "New Query"

### Step 2: Execute Schema Functions

Copy and paste the entire content from `backend/schema_introspection.sql` into the SQL editor and click "Run".

This will create the following functions:
- `get_database_tables()` - Lists all user tables
- `get_table_columns(table_name)` - Gets column details
- `get_foreign_keys()` - Gets relationship information
- `get_table_stats(table_name)` - Gets table statistics
- `get_table_indexes(table_name)` - Gets index information

### Step 3: Verify Functions Are Created

Run this query to check if the functions were created successfully:

```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'get_%';
```

You should see all 5 functions listed.

### Step 4: Test a Function

Test one of the functions to make sure it works:

```sql
SELECT * FROM get_database_tables();
```

This should return a list of your database tables.

## Troubleshooting

### If you get permission errors:
Make sure you're running the SQL as a database owner or with sufficient privileges.

### If functions don't appear:
1. Check for syntax errors in the SQL output
2. Make sure you're in the correct database/schema
3. Try creating functions one by one to isolate any issues

### If the app still shows errors:
1. Restart your app/refresh the page
2. Check that your Supabase connection is working
3. The app will fall back to basic functionality if functions aren't available

## What You Get With Functions Enabled

✅ **Real-time Schema**: Live database structure from information_schema
✅ **Accurate Statistics**: Real row counts, table sizes, index information  
✅ **Relationship Detection**: Automatic foreign key relationship mapping
✅ **Column Details**: Data types, constraints, comments from actual database
✅ **Performance Metrics**: Table and index sizes for optimization

## What Works Without Functions (Current State)

✅ **Basic Schema**: Predefined schema for core tables (projects, data_records, activity_logs)
✅ **Estimated Stats**: Row counts from actual queries, estimated sizes
✅ **Core Functionality**: All CRUD operations, data logging, project management
✅ **Schema Configuration**: Manual schema management through the UI

The app is fully functional in both modes - the advanced features just provide more detailed and real-time information about your database structure.
