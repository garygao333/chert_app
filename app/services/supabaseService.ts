// Direct Supabase service for real-time data queries
import { supabase } from './supabase';
import type { Project, RecentActivity, DataRecord, DatabaseSchema, RecordMetadata, Table, Column, Relationship } from '../types';

export class SupabaseService {
  // Projects
  static async getProjects(): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        return [];
      }

      if (!data || !Array.isArray(data)) {
        console.warn('No projects data returned from Supabase');
        return [];
      }

      return data.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        documentation: project.documentation,
        databaseType: project.database_type,
        connectionString: project.connection_string,
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
        schema: project.schema
      }));
    } catch (error) {
      console.error('Error in getProjects:', error);
      return [];
    }
  }

  static async getProject(id: string): Promise<Project | null> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        documentation: data.documentation,
        databaseType: data.database_type,
        connectionString: data.connection_string,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        schema: data.schema
      };
    } catch (error) {
      console.error('Error in getProject:', error);
      return null;
    }
  }

  // Recent Activity from activity_logs
  static async getRecentActivity(limit: number = 10, projectId?: string): Promise<RecentActivity[]> {
    try {
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          projects (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching activity:', error);
        return [];
      }

      if (!data || !Array.isArray(data)) {
        console.warn('No activity data returned from Supabase');
        return [];
      }

      return data.map((activity: any) => ({
        id: activity.id,
        type: activity.action as 'commit' | 'create' | 'update',
        description: activity.description,
        projectId: activity.project_id,
        projectName: (activity.projects as any)?.name || 'Unknown Project',
        timestamp: new Date(activity.created_at)
      }));
    } catch (error) {
      console.error('Error in getRecentActivity:', error);
      return [];
    }
  }

  // Get project statistics
  static async getProjectStats(projectId: string): Promise<{
    totalRecords: number;
    lastActivity: Date | null;
  }> {
    try {
      // Get total records count
      const { count: recordsCount, error: recordsError } = await supabase
        .from('data_records')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      if (recordsError) {
        console.error('Error fetching records count:', recordsError);
      }

      // Get samples count
      const { count: samplesCount, error: samplesError } = await supabase
        .from('samples')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      if (samplesError) {
        console.error('Error fetching samples count:', samplesError);
      }

      // Get last activity
      const { data: lastActivityData, error: activityError } = await supabase
        .from('activity_logs')
        .select('created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (activityError) {
        console.error('Error fetching last activity:', activityError);
      }

      const totalRecords = (recordsCount || 0) + (samplesCount || 0);
      const lastActivity = lastActivityData?.[0] 
        ? new Date(lastActivityData[0].created_at)
        : null;

      return {
        totalRecords,
        lastActivity
      };
    } catch (error) {
      console.error('Error in getProjectStats:', error);
      return {
        totalRecords: 0,
        lastActivity: null
      };
    }
  }

  // Get dashboard stats
  static async getDashboardStats(): Promise<{
    totalProjects: number;
    activeProjects: number;
    totalRecords: number;
    recentActivityCount: number;
  }> {
    try {
      // Get total projects
      const { count: projectsCount, error: projectsError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      if (projectsError) {
        console.error('Error fetching projects count:', projectsError);
      }

      // Get active projects (projects with activity in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activeProjectsData, error: activeError } = await supabase
        .from('activity_logs')
        .select('project_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (activeError) {
        console.error('Error fetching active projects:', activeError);
      }

      const activeProjectIds = new Set(activeProjectsData?.map((a: any) => a.project_id) || []);

      // Get total records across all projects
      const { count: dataRecordsCount, error: dataRecordsError } = await supabase
        .from('data_records')
        .select('*', { count: 'exact', head: true });

      const { count: samplesCount, error: samplesError } = await supabase
        .from('samples')
        .select('*', { count: 'exact', head: true });

      if (dataRecordsError || samplesError) {
        console.error('Error fetching records count:', dataRecordsError, samplesError);
      }

      // Get recent activity count (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recentActivityCount, error: recentActivityError } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      if (recentActivityError) {
        console.error('Error fetching recent activity count:', recentActivityError);
      }

      return {
        totalProjects: projectsCount || 0,
        activeProjects: activeProjectIds.size,
        totalRecords: (dataRecordsCount || 0) + (samplesCount || 0),
        recentActivityCount: recentActivityCount || 0
      };
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      return {
        totalProjects: 0,
        activeProjects: 0,
        totalRecords: 0,
        recentActivityCount: 0
      };
    }
  }

  // Create activity log entry
  static async logActivity(
    projectId: string,
    action: string,
    description: string,
    metadata?: any
  ): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      const userId = user?.id || null;
      
      const { error } = await supabase
        .from('activity_logs')
        .insert({
          project_id: projectId,
          user_id: userId,
          action,
          description,
          metadata
        });

      if (error) {
        console.error('Error logging activity:', error);
      }
    } catch (error) {
      console.error('Error in logActivity:', error);
    }
  }

  // Authentication methods
  static async signUp(email: string, password: string, fullName?: string): Promise<{ user: any; error: any }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error('Error in signUp:', error);
      return { user: null, error };
    }
  }

  static async signIn(email: string, password: string): Promise<{ user: any; error: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error('Error in signIn:', error);
      return { user: null, error };
    }
  }

  static async signOut(): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in signOut:', error);
      return { error };
    }
  }

  static async getCurrentUser(): Promise<any> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Get current user error:', error);
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return null;
    }
  }

  static async resetPassword(email: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'com.chert.app://reset-password',
      });

      if (error) {
        console.error('Reset password error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return { error };
    }
  }

  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Data Records methods
  static async getDataRecords(projectId: string, limit: number = 50, offset: number = 0): Promise<{
    records: DataRecord[];
    total: number;
  }> {
    try {
      // Get total count
      const { count: totalCount, error: countError } = await supabase
        .from('data_records')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      if (countError) {
        console.error('Error getting data records count:', countError);
      }

      // Get records with pagination
      const { data, error } = await supabase
        .from('data_records')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching data records:', error);
        return { records: [], total: 0 };
      }

      if (!data || !Array.isArray(data)) {
        console.warn('No data records returned from Supabase');
        return { records: [], total: totalCount || 0 };
      }

      const records = data.map((record: any) => ({
        id: record.id,
        projectId: record.project_id,
        tableName: record.table_name,
        data: record.data,
        confidence: record.confidence || 0,
        metadata: record.metadata || {},
        createdAt: new Date(record.created_at),
        updatedAt: new Date(record.updated_at)
      }));

      return {
        records,
        total: totalCount || 0
      };
    } catch (error) {
      console.error('Error in getDataRecords:', error);
      return { records: [], total: 0 };
    }
  }

  // Database Schema methods
  static async getDatabaseSchema(projectId: string): Promise<DatabaseSchema | null> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('schema')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Error fetching database schema:', error);
        return null;
      }

      return data?.schema || null;
    } catch (error) {
      console.error('Error in getDatabaseSchema:', error);
      return null;
    }
  }

  // Get actual database schema from Supabase information_schema
  static async getActualDatabaseSchema(projectId: string): Promise<DatabaseSchema | null> {
    try {
      // Get project connection info
      const project = await this.getProject(projectId);
      if (!project) {
        console.error('Project not found');
        return null;
      }

      // For now, return the stored schema until custom functions are set up
      // This prevents the PGRST202 error when functions don't exist yet
      try {
        // Try to use custom functions if they exist
        const { data: tablesData, error: tablesError } = await supabase.rpc('get_database_tables');
        
        if (tablesError) {
          console.log('Custom functions not available, falling back to stored schema');
          return project.schema || this.getBasicDatabaseSchema();
        }

        // Get columns for each table
        const tables: Table[] = [];
        
        for (const tableInfo of tablesData || []) {
          const { data: columnsData, error: columnsError } = await supabase.rpc('get_table_columns', {
            table_name: tableInfo.table_name
          });

          if (columnsError) {
            console.error(`Error fetching columns for table ${tableInfo.table_name}:`, columnsError);
            continue;
          }

          const columns: Column[] = (columnsData || []).map((col: any) => ({
            name: col.column_name,
            type: col.data_type,
            required: col.is_nullable === 'NO',
            description: col.column_comment || undefined
          }));

          tables.push({
            name: tableInfo.table_name,
            columns
          });
        }

        // Get foreign key relationships
        const { data: relationshipsData, error: relationshipsError } = await supabase.rpc('get_foreign_keys');
        
        const relationships: Relationship[] = (relationshipsData || []).map((rel: any) => ({
          fromTable: rel.table_name,
          fromColumn: rel.column_name,
          toTable: rel.foreign_table_name,
          toColumn: rel.foreign_column_name,
          type: 'one-to-many' as const
        }));

        return {
          tables,
          relationships
        };
      } catch (rpcError) {
        console.log('RPC functions not available, using fallback schema');
        return project.schema || this.getBasicDatabaseSchema();
      }
    } catch (error) {
      console.error('Error in getActualDatabaseSchema:', error);
      // Fallback to stored schema
      return this.getDatabaseSchema(projectId);
    }
  }

  // Provide a basic database schema as fallback
  static getBasicDatabaseSchema(): DatabaseSchema {
    return {
      tables: [
        {
          name: 'projects',
          columns: [
            { name: 'id', type: 'uuid', required: true, description: 'Primary key' },
            { name: 'name', type: 'varchar(255)', required: true, description: 'Project name' },
            { name: 'description', type: 'text', required: false, description: 'Project description' },
            { name: 'database_type', type: 'varchar(50)', required: true, description: 'Database type' },
            { name: 'connection_string', type: 'text', required: false, description: 'Database connection' },
            { name: 'schema', type: 'jsonb', required: false, description: 'Project schema' },
            { name: 'created_at', type: 'timestamptz', required: true, description: 'Creation timestamp' },
            { name: 'updated_at', type: 'timestamptz', required: true, description: 'Update timestamp' },
            { name: 'user_id', type: 'uuid', required: true, description: 'Owner user ID' }
          ]
        },
        {
          name: 'data_records',
          columns: [
            { name: 'id', type: 'uuid', required: true, description: 'Primary key' },
            { name: 'project_id', type: 'uuid', required: true, description: 'Project reference' },
            { name: 'table_name', type: 'varchar(255)', required: true, description: 'Target table name' },
            { name: 'data', type: 'jsonb', required: true, description: 'Record data' },
            { name: 'confidence', type: 'float', required: false, description: 'Confidence score' },
            { name: 'metadata', type: 'jsonb', required: false, description: 'Record metadata' },
            { name: 'created_at', type: 'timestamptz', required: true, description: 'Creation timestamp' },
            { name: 'updated_at', type: 'timestamptz', required: true, description: 'Update timestamp' },
            { name: 'user_id', type: 'uuid', required: true, description: 'Creator user ID' }
          ]
        },
        {
          name: 'activity_logs',
          columns: [
            { name: 'id', type: 'uuid', required: true, description: 'Primary key' },
            { name: 'project_id', type: 'uuid', required: true, description: 'Project reference' },
            { name: 'user_id', type: 'uuid', required: true, description: 'User reference' },
            { name: 'action', type: 'varchar(50)', required: true, description: 'Action type' },
            { name: 'description', type: 'text', required: true, description: 'Action description' },
            { name: 'metadata', type: 'jsonb', required: false, description: 'Action metadata' },
            { name: 'created_at', type: 'timestamptz', required: true, description: 'Creation timestamp' }
          ]
        }
      ],
      relationships: [
        {
          fromTable: 'data_records',
          fromColumn: 'project_id',
          toTable: 'projects',
          toColumn: 'id',
          type: 'many-to-one'
        },
        {
          fromTable: 'activity_logs',
          fromColumn: 'project_id',
          toTable: 'projects',
          toColumn: 'id',
          type: 'many-to-one'
        },
        {
          fromTable: 'projects',
          fromColumn: 'user_id',
          toTable: 'auth.users',
          toColumn: 'id',
          type: 'many-to-one'
        }
      ]
    };
  }

  // Get table statistics for a project
  static async getTableStats(projectId: string, tableName: string): Promise<{
    rowCount: number;
    totalSize: string;
    tableSize: string;
    indexSize: string;
  } | null> {
    try {
      // Try to use custom function if available
      const { data, error } = await supabase.rpc('get_table_stats', {
        table_name: tableName
      });

      if (error) {
        // If custom function doesn't exist, provide fallback stats
        console.log(`Custom stats function not available for table ${tableName}, using fallback`);
        return this.getFallbackTableStats(projectId, tableName);
      }

      const stats = data?.[0];
      if (!stats) return this.getFallbackTableStats(projectId, tableName);

      return {
        rowCount: stats.row_count || 0,
        totalSize: stats.total_size || '0 bytes',
        tableSize: stats.table_size || '0 bytes',
        indexSize: stats.index_size || '0 bytes'
      };
    } catch (error) {
      console.log('Error in getTableStats, using fallback:', error);
      return this.getFallbackTableStats(projectId, tableName);
    }
  }

  // Fallback table stats when custom functions aren't available
  static async getFallbackTableStats(projectId: string, tableName: string): Promise<{
    rowCount: number;
    totalSize: string;
    tableSize: string;
    indexSize: string;
  }> {
    try {
      let rowCount = 0;

      // Get actual row count for known tables
      if (tableName === 'data_records') {
        const { count, error } = await supabase
          .from('data_records')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId);
        
        if (!error) {
          rowCount = count || 0;
        }
      } else if (tableName === 'activity_logs') {
        const { count, error } = await supabase
          .from('activity_logs')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId);
        
        if (!error) {
          rowCount = count || 0;
        }
      } else if (tableName === 'projects') {
        const { count, error } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          rowCount = count || 0;
        }
      }

      // Estimate size based on row count (rough approximation)
      const estimatedSizeBytes = rowCount * 1024; // 1KB per row estimate
      const sizeInKB = Math.round(estimatedSizeBytes / 1024);
      const sizeStr = sizeInKB > 1024 
        ? `${Math.round(sizeInKB / 1024)} MB`
        : `${sizeInKB} KB`;

      return {
        rowCount,
        totalSize: sizeStr,
        tableSize: sizeStr,
        indexSize: '0 KB'
      };
    } catch (error) {
      console.error('Error in getFallbackTableStats:', error);
      return {
        rowCount: 0,
        totalSize: '0 KB',
        tableSize: '0 KB',
        indexSize: '0 KB'
      };
    }
  }

  // Get comprehensive database info including schema and stats
  static async getDatabaseInfo(projectId: string): Promise<{
    schema: DatabaseSchema | null;
    tableStats: Record<string, any>;
  }> {
    try {
      // Get the actual database schema
      const schema = await this.getActualDatabaseSchema(projectId);
      
      // Get stats for each table
      const tableStats: Record<string, any> = {};
      if (schema?.tables) {
        for (const table of schema.tables) {
          try {
            const stats = await this.getTableStats(projectId, table.name);
            if (stats) {
              tableStats[table.name] = stats;
            } else {
              // Provide default stats if none available
              tableStats[table.name] = {
                rowCount: 0,
                totalSize: '0 KB',
                tableSize: '0 KB',
                indexSize: '0 KB'
              };
            }
          } catch (error) {
            console.error(`Error getting stats for table ${table.name}:`, error);
            // Provide default stats on error
            tableStats[table.name] = {
              rowCount: 0,
              totalSize: '0 KB',
              tableSize: '0 KB',
              indexSize: '0 KB'
            };
          }
        }
      }

      return {
        schema: schema || this.getBasicDatabaseSchema(),
        tableStats
      };
    } catch (error) {
      console.error('Error in getDatabaseInfo:', error);
      return {
        schema: this.getBasicDatabaseSchema(),
        tableStats: {}
      };
    }
  }

  static async updateDatabaseSchema(projectId: string, schema: DatabaseSchema): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          schema,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) {
        console.error('Error updating database schema:', error);
        return false;
      }

      // Log the activity
      await this.logActivity(
        projectId,
        'update',
        'Database schema updated',
        { schemaUpdate: true }
      );

      return true;
    } catch (error) {
      console.error('Error in updateDatabaseSchema:', error);
      return false;
    }
  }

  // Create new data record
  static async createDataRecord(
    projectId: string,
    tableName: string,
    data: Record<string, any>,
    metadata: RecordMetadata,
    confidence: number = 1.0
  ): Promise<string | null> {
    try {
      const user = await this.getCurrentUser();
      const userId = user?.id || null;
      
      const { data: insertData, error } = await supabase
        .from('data_records')
        .insert({
          project_id: projectId,
          table_name: tableName,
          data,
          metadata,
          confidence,
          user_id: userId
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating data record:', error);
        return null;
      }

      // Log the activity
      await this.logActivity(
        projectId,
        'create',
        `New data record created in ${tableName}`,
        { tableName, recordId: insertData.id }
      );

      return insertData.id;
    } catch (error) {
      console.error('Error in createDataRecord:', error);
      return null;
    }
  }

  // Delete data record
  static async deleteDataRecord(recordId: string, projectId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('data_records')
        .delete()
        .eq('id', recordId);

      if (error) {
        console.error('Error deleting data record:', error);
        return false;
      }

      // Log the activity
      await this.logActivity(
        projectId,
        'update',
        'Data record deleted',
        { recordId, action: 'delete' }
      );

      return true;
    } catch (error) {
      console.error('Error in deleteDataRecord:', error);
      return false;
    }
  }
}
