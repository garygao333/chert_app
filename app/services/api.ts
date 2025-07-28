// API service for backend integration
import Constants from 'expo-constants';
import type { Project, DataRecord, RecentActivity } from '../types';
import { supabase } from './supabase';

// Get API URL from environment
const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// API service for backend integration
export class ApiService {
  private static baseUrl = API_URL;

  private static async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Projects
  static async getProjects(): Promise<Project[]> {
    try {
      return await this.makeRequest<Project[]>('/projects');
    } catch (error) {
      console.log('Using fallback data due to API error:', error);
      // Fallback to mock data if backend is not available
      return [
        {
          id: 'proj1',
          name: 'Tharros Project',
          description: 'Archaeological field data collection for Tharros excavation site',
          documentation: 'Detailed documentation for Tharros project...',
          databaseType: 'PostgreSQL',
          connectionString: 'postgresql://...',
          createdAt: new Date('2025-07-20'),
          updatedAt: new Date('2025-07-25'),
        },
      ];
    }
  }

  static async getProject(id: string): Promise<Project | null> {
    try {
      return await this.makeRequest<Project>(`/projects/${id}`);
    } catch (error) {
      console.log('Using fallback data due to API error:', error);
      const projects = await this.getProjects();
      return projects.find(p => p.id === id) || null;
    }
  }

  static async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    try {
      return await this.makeRequest<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: project.name,
          description: project.description,
          documentation: project.documentation,
          database_type: project.databaseType,
          connection_string: project.connectionString,
        }),
      });
    } catch (error) {
      console.log('Using fallback data due to API error:', error);
      const newProject: Project = {
        ...project,
        id: `proj_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      console.log('Creating project:', newProject);
      return newProject;
    }
  }

  static async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    try {
      return await this.makeRequest<Project>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.log('Using fallback data due to API error:', error);
      const project = await this.getProject(id);
      if (!project) throw new Error('Project not found');
      
      return { ...project, ...updates, updatedAt: new Date() };
    }
  }

  static async deleteProject(id: string): Promise<void> {
    try {
      await this.makeRequest<void>(`/projects/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.log('Using fallback data due to API error:', error);
      console.log('Deleting project:', id);
    }
  }

  // Data Records
  static async getDataRecords(projectId: string): Promise<DataRecord[]> {
    try {
      return await this.makeRequest<DataRecord[]>(`/projects/${projectId}/records`);
    } catch (error) {
      console.log('Using fallback data due to API error:', error);
      return [];
    }
  }

  static async createDataRecord(record: Omit<DataRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataRecord> {
    try {
      return await this.makeRequest<DataRecord>(`/projects/${record.projectId}/records`, {
        method: 'POST',
        body: JSON.stringify({
          table_name: record.tableName,
          data: record.data,
          metadata: record.metadata,
        }),
      });
    } catch (error) {
      console.log('Using fallback data due to API error:', error);
      const newRecord: DataRecord = {
        ...record,
        id: `record_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      console.log('Creating data record:', newRecord);
      return newRecord;
    }
  }

  // Activity
  static async getRecentActivity(projectId?: string): Promise<RecentActivity[]> {
    try {
      const endpoint = projectId ? `/projects/${projectId}/activity` : '/activity';
      return await this.makeRequest<RecentActivity[]>(endpoint);
    } catch (error) {
      console.log('Using fallback data due to API error:', error);
      // Mock data
      return [
        {
          id: '1',
          type: 'commit',
          description: 'user37 committed new data',
          projectId: 'proj1',
          projectName: 'Tharros Project',
          timestamp: new Date('2025-07-25T10:30:00'),
        },
        {
          id: '2',
          type: 'create',
          description: 'user37 started new data column',
          projectId: 'proj1',
          projectName: 'Tharros Project',
          timestamp: new Date('2025-07-25T09:15:00'),
        },
      ];
    }
  }

  static async logActivity(activity: Omit<RecentActivity, 'id' | 'timestamp'>): Promise<void> {
    try {
      await this.makeRequest<void>(`/projects/${activity.projectId}/activity`, {
        method: 'POST',
        body: JSON.stringify(activity),
      });
    } catch (error) {
      console.log('Using fallback data due to API error:', error);
      console.log('Logging activity:', activity);
    }
  }

  // AI/Voice Processing
  static async processVoiceInput(audioBlob: Blob, projectId: string): Promise<{
    transcription: string;
    extracted_data: Record<string, any>;
    confidence: number;
    suggested_fields: string[];
    reasoning: string;
    commit_id?: string;
    workflow_plan?: any;
    tool_events?: any[];
  }> {
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'audio.wav');
      formData.append('project_id', projectId);

      const response = await fetch(`${this.baseUrl}/voice/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        transcription: result.transcription,
        extracted_data: result.extracted_data || {},
        confidence: result.confidence || 0.0,
        suggested_fields: result.suggested_fields || [],
        reasoning: result.reasoning || '',
        commit_id: result.commit_id,
        workflow_plan: result.workflow_plan,
        tool_events: result.tool_events || []
      };
    } catch (error) {
      console.log('Using fallback data due to API error:', error);
      
      // Mock response for development
      return {
        transcription: 'Found ceramic sherd, 3cm diameter, reddish-brown color',
        extracted_data: {
          artifact_type: 'Ceramic Sherd',
          dimensions: '3cm diameter',
          color: 'Reddish-brown',
          material: 'Ceramic',
          weight: '15g'
        },
        confidence: 0.85,
        suggested_fields: ['artifact_type', 'dimensions', 'color', 'material', 'weight'],
        reasoning: 'Voice input processed with LangGraph archaeological workflow',
        workflow_plan: {
          summary: 'Record ceramic artifacts with photo documentation',
          steps: [
            { type: 'photo', prompt: 'Please photograph the artifacts' },
            { type: 'vision', model: 'yolo' },
            { type: 'verification', prompt: 'Verify detected artifacts' }
          ]
        }
      };
    }
  }

  // Simple transcription without full workflow
  static async transcribeAudio(audioBlob: Blob): Promise<{
    transcription: string;
    status: string;
    error?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'audio.wav');

      const response = await fetch(`${this.baseUrl}/voice/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.log('Transcription error:', error);
      return {
        transcription: '',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Image processing for computer vision
  static async processImage(imageUri: string, projectId: string): Promise<{
    detections: Array<{
      bbox: number[];
      label: string;
      confidence: number;
    }>;
    extracted_data: Record<string, any>;
    confidence: number;
  }> {
    try {
      const formData = new FormData();
      formData.append('image_file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'photo.jpg'
      } as any);
      formData.append('project_id', projectId);

      const response = await fetch(`${this.baseUrl}/image/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.log('Image processing error:', error);
      return {
        detections: [],
        extracted_data: {},
        confidence: 0.0
      };
    }
  }

  // Audit and rollback operations
  static async getAuditLog(projectId: string): Promise<Array<{
    id: string;
    commit_id: string;
    action: string;
    affected_records: string[];
    timestamp: string;
    data_diff: any;
  }>> {
    try {
      return await this.makeRequest(`/projects/${projectId}/audit`);
    } catch (error) {
      console.log('Audit log error:', error);
      return [];
    }
  }

  static async rollbackCommit(commitId: string): Promise<{
    success: boolean;
    rows_removed: number;
    message: string;
  }> {
    try {
      return await this.makeRequest(`/audit/${commitId}/rollback`, {
        method: 'POST'
      });
    } catch (error) {
      console.log('Rollback error:', error);
      return {
        success: false,
        rows_removed: 0,
        message: 'Rollback failed'
      };
    }
  }

  // Schema analysis
  static async getProjectSchema(projectId: string): Promise<{
    schema: {
      tables: Array<{
        name: string;
        columns: Array<{
          name: string;
          type: string;
          nullable: boolean;
          primary_key: boolean;
        }>;
      }>;
    };
    suggestions: string[];
    confidence: number;
  }> {
    try {
      return await this.makeRequest(`/projects/${projectId}/schema`);
    } catch (error) {
      console.log('Schema analysis error:', error);
      return {
        schema: {
          tables: [
            {
              name: 'samples',
              columns: [
                { name: 'id', type: 'uuid', nullable: false, primary_key: true },
                { name: 'artifact_type', type: 'text', nullable: true, primary_key: false },
                { name: 'description', type: 'text', nullable: true, primary_key: false },
                { name: 'weight', type: 'float', nullable: true, primary_key: false }
              ]
            }
          ]
        },
        suggestions: ['Include weight in grams', 'Add material classification'],
        confidence: 0.9
      };
    }
  }

  // Health check
  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      return await this.makeRequest<any>('/health');
    } catch (error) {
      return {
        status: 'unavailable',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
