// Direct Supabase service for real-time data queries
import { supabase } from './supabase';
import type { Project, RecentActivity, DataRecord } from '../types';

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
      const { error } = await supabase
        .from('activity_logs')
        .insert({
          project_id: projectId,
          user_id: 'current-user', // Replace with actual user ID when auth is implemented
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
}
