// Supabase configuration and client setup
import { createClient } from '@supabase/supabase-js';

// Hardcoded production Supabase configuration
const supabaseUrl = "https://suiqpfnvfadscyvtgcjz.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1aXFwZm52ZmFkc2N5dnRnY2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTc5MDQsImV4cCI6MjA2OTA3MzkwNH0.c-Twnh7ZlO9dBFKpTye1VMciXfeXeczlWkyJAZurx4g";

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
