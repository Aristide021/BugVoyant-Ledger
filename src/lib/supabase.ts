import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          sentry_auth_token: string;
          sentry_org_slug: string;
          slack_webhook_url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          sentry_auth_token: string;
          sentry_org_slug: string;
          slack_webhook_url: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          sentry_auth_token?: string;
          sentry_org_slug?: string;
          slack_webhook_url?: string;
          created_at?: string;
          updated_at?: string;
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
    };
  };
};