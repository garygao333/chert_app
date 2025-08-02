-- Database schema introspection functions for Supabase
-- These functions allow the app to dynamically query the database structure

-- Function to get all user tables (excluding system tables)
CREATE OR REPLACE FUNCTION get_database_tables()
RETURNS TABLE (
    table_name text,
    table_schema text,
    table_type text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::text,
        t.table_schema::text,
        t.table_type::text
    FROM information_schema.tables t
    WHERE t.table_schema = current_schema()
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'pg_%'
    AND t.table_name NOT LIKE 'sql_%'
    AND t.table_name NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')
    ORDER BY t.table_name;
END;
$$;

-- Function to get columns for a specific table
CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
RETURNS TABLE (
    column_name text,
    data_type text,
    is_nullable text,
    column_default text,
    character_maximum_length integer,
    numeric_precision integer,
    numeric_scale integer,
    column_comment text,
    ordinal_position integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.column_name::text,
        c.data_type::text,
        c.is_nullable::text,
        c.column_default::text,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        col_description(pgc.oid, c.ordinal_position)::text as column_comment,
        c.ordinal_position
    FROM information_schema.columns c
    LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
    WHERE c.table_name = get_table_columns.table_name
    AND c.table_schema = current_schema()
    ORDER BY c.ordinal_position;
END;
$$;

-- Function to get foreign key relationships
CREATE OR REPLACE FUNCTION get_foreign_keys()
RETURNS TABLE (
    table_name text,
    column_name text,
    foreign_table_name text,
    foreign_column_name text,
    constraint_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kcu.table_name::text,
        kcu.column_name::text,
        ccu.table_name::text as foreign_table_name,
        ccu.column_name::text as foreign_column_name,
        tc.constraint_name::text
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = current_schema()
    ORDER BY kcu.table_name, kcu.ordinal_position;
END;
$$;

-- Function to get table indexes
CREATE OR REPLACE FUNCTION get_table_indexes(table_name text)
RETURNS TABLE (
    index_name text,
    column_name text,
    is_unique boolean,
    is_primary boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.relname::text as index_name,
        a.attname::text as column_name,
        idx.indisunique as is_unique,
        idx.indisprimary as is_primary
    FROM pg_class t
    JOIN pg_index idx ON t.oid = idx.indrelid
    JOIN pg_class i ON i.oid = idx.indexrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(idx.indkey)
    WHERE t.relname = get_table_indexes.table_name
    AND t.relkind = 'r'
    ORDER BY i.relname, a.attnum;
END;
$$;

-- Function to get table statistics (row count, size, etc.)
CREATE OR REPLACE FUNCTION get_table_stats(table_name text)
RETURNS TABLE (
    table_name text,
    row_count bigint,
    total_size text,
    table_size text,
    index_size text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        get_table_stats.table_name::text,
        (SELECT count(*) FROM (SELECT 1 FROM pg_class WHERE relname = get_table_stats.table_name) as subq)::bigint as row_count,
        pg_size_pretty(pg_total_relation_size(quote_ident(get_table_stats.table_name)::regclass))::text as total_size,
        pg_size_pretty(pg_relation_size(quote_ident(get_table_stats.table_name)::regclass))::text as table_size,
        pg_size_pretty(pg_total_relation_size(quote_ident(get_table_stats.table_name)::regclass) - pg_relation_size(quote_ident(get_table_stats.table_name)::regclass))::text as index_size;
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            get_table_stats.table_name::text,
            0::bigint as row_count,
            '0 bytes'::text as total_size,
            '0 bytes'::text as table_size,
            '0 bytes'::text as index_size;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_database_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_columns(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_foreign_keys() TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_indexes(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_stats(text) TO authenticated;
