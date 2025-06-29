import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Enhanced error handling
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  
  if (error?.code === 'PGRST301') {
    return 'Database connection error. Please try again.';
  }
  
  if (error?.code === '22P02') {
    return 'Invalid data format. Please check your input.';
  }
  
  if (error?.code === '23505') {
    return 'This record already exists.';
  }
  
  if (error?.code === '42501') {
    return 'Permission denied. Please check your access rights.';
  }
  
  return error?.message || 'An unexpected error occurred.';
};

// Database types with enhanced security fields
export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      encrypted_secrets: {
        Row: {
          id: string;
          project_id: string;
          secret_type: string;
          encrypted_value: string;
          key_hash: string;
          created_at: string;
          updated_at: string;
          expires_at: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          project_id: string;
          secret_type: string;
          encrypted_value: string;
          key_hash: string;
          created_at?: string;
          updated_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          project_id?: string;
          secret_type?: string;
          encrypted_value?: string;
          key_hash?: string;
          created_at?: string;
          updated_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
        };
      };
      reports: {
        Row: {
          id: number;
          project_id: string;
          sentry_issue_id: string;
          title: string;
          markdown: string;
          algorand_tx: string | null;
          audio_url: string | null;
          status: 'processing' | 'completed' | 'failed' | 'partial' | 'pending_hash' | 'text_only';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          project_id: string;
          sentry_issue_id: string;
          title: string;
          markdown: string;
          algorand_tx?: string | null;
          audio_url?: string | null;
          status?: 'processing' | 'completed' | 'failed' | 'partial' | 'pending_hash' | 'text_only';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          project_id?: string;
          sentry_issue_id?: string;
          title?: string;
          markdown?: string;
          algorand_tx?: string | null;
          audio_url?: string | null;
          status?: 'processing' | 'completed' | 'failed' | 'partial' | 'pending_hash' | 'text_only';
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          project_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          old_values: any;
          new_values: any;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          old_values?: any;
          new_values?: any;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          old_values?: any;
          new_values?: any;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      api_key_rotations: {
        Row: {
          id: string;
          project_id: string;
          secret_type: string;
          rotation_reason: string | null;
          old_key_hash: string | null;
          new_key_hash: string | null;
          rotated_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          secret_type: string;
          rotation_reason?: string | null;
          old_key_hash?: string | null;
          new_key_hash?: string | null;
          rotated_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          secret_type?: string;
          rotation_reason?: string | null;
          old_key_hash?: string | null;
          new_key_hash?: string | null;
          rotated_by?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      store_encrypted_secret: {
        Args: {
          p_project_id: string;
          p_secret_type: string;
          p_secret_value: string;
          p_encryption_key: string;
        };
        Returns: string;
      };
      get_decrypted_secret: {
        Args: {
          p_project_id: string;
          p_secret_type: string;
          p_encryption_key: string;
        };
        Returns: string;
      };
      log_audit_event: {
        Args: {
          p_user_id?: string;
          p_project_id?: string;
          p_action: string;
          p_resource_type: string;
          p_resource_id?: string;
          p_old_values?: any;
          p_new_values?: any;
        };
        Returns: string;
      };
    };
  };
};