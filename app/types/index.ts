// Type definitions for Chert app

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt?: Date;
  userId: string;
  csvContent?: string;
  csvMetadata?: {
    fileName: string;
    fileSize: number;
    totalRows: number;
    sampleRows: string[];
  };
  dataColumns?: string[];
  generalAnnotations?: string;
  columnAnnotations?: Record<string, string>;
  // Legacy fields for backward compatibility
  documentation?: string;
  databaseType?: string;
  connectionString?: string;
  schema?: DatabaseSchema;
}

export interface DatabaseSchema {
  tables: Table[];
  relationships: Relationship[];
}

export interface Table {
  name: string;
  columns: Column[];
}

export interface Column {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'many-to-one';
}

export interface DataRecord {
  id: string;
  projectId: string;
  tableName: string;
  data: Record<string, any>;
  confidence: number;
  metadata: RecordMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordMetadata {
  recordingMethod: 'voice' | 'image' | 'manual';
  location?: {
    latitude: number;
    longitude: number;
  };
  audioFile?: string;
  imageFiles?: string[];
  reasoning?: string;
  userFeedback?: string;
}

export interface RecentActivity {
  id: string;
  type: 'commit' | 'create' | 'update';
  description: string;
  projectId: string;
  projectName: string;
  timestamp: Date;
}

// Authentication types
export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Login: undefined;
  Signup: undefined;
  MainTabs: undefined;
  Projects: undefined;
  CreateProject: undefined;
  ProjectDetail: { projectId: string };
  DataLogs: { projectId: string };
  DatabaseSchema: { projectId: string };
  DataSchemaConfig: { projectId: string };
  Account: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Projects: undefined;
  Settings: undefined;
};
