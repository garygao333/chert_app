// Supabase configuration and client setup
// This will be configured when integrating with the actual Supabase backend

import { createClient } from '@supabase/supabase-js';

// TODO: Replace with actual Supabase URL and anon key
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types based on Supabase schema
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          description: string;
          documentation: string;
          database_type: string;
          connection_string: string;
          schema: any;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          documentation: string;
          database_type: string;
          connection_string: string;
          schema?: any;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          documentation?: string;
          database_type?: string;
          connection_string?: string;
          schema?: any;
          updated_at?: string;
        };
      };
      data_records: {
        Row: {
          id: string;
          project_id: string;
          table_name: string;
          data: any;
          confidence: number;
          metadata: any;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          table_name: string;
          data: any;
          confidence: number;
          metadata: any;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          data?: any;
          confidence?: number;
          metadata?: any;
          updated_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          action: string;
          description: string;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          action: string;
          description: string;
          metadata?: any;
          created_at?: string;
        };
      };
    };
  };
}
