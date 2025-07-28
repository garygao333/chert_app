// Supabase configuration and client setup
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get configuration from environment variables
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your .env file and ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.');
}

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
      samples: {
        Row: {
          id: string;
          class: string;
          weight: number;
          dimensions: string;
          color: string;
          material: string;
          location: string;
          image_url: string;
          project_id: string;
          confidence: number;
          metadata: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class?: string;
          weight?: number;
          dimensions?: string;
          color?: string;
          material?: string;
          location?: string;
          image_url?: string;
          project_id: string;
          confidence?: number;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          class?: string;
          weight?: number;
          dimensions?: string;
          color?: string;
          material?: string;
          location?: string;
          image_url?: string;
          confidence?: number;
          metadata?: any;
          updated_at?: string;
        };
      };
    };
  };
}
