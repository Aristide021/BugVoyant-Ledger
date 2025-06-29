/*
  # Enhanced monitoring and analytics system

  1. New Tables
    - `processing_metrics` - Track processing steps and performance
    - `cost_tracking` - Monitor costs across all services
    - `retention_policies` - Data retention management
    - `system_health` - System health metrics
    - `budget_alerts` - Budget monitoring and alerts

  2. Enhanced Features
    - Audit log enhancements with IP tracking
    - Cost tracking with budget alerts
    - Processing metrics for monitoring
    - Data retention policies
    - System health monitoring

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for user data isolation
    - Secure functions with SECURITY DEFINER

  4. Performance
    - Add indexes for common query patterns
    - Optimize for time-series data access
*/

-- Enhanced audit logging with IP and user agent tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN session_id text;
    ALTER TABLE audit_logs ADD COLUMN request_id text;
    ALTER TABLE audit_logs ADD COLUMN cost_cents integer DEFAULT 0;
    ALTER TABLE audit_logs ADD COLUMN processing_time_ms integer;
    ALTER TABLE audit_logs ADD COLUMN provider_used text;
    ALTER TABLE audit_logs ADD COLUMN wallet_address text;
  END IF;
END $$;

-- Processing metrics table for monitoring and analytics
CREATE TABLE IF NOT EXISTS processing_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id integer REFERENCES reports(id) ON DELETE CASCADE,
  step_name text NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  status text CHECK (status IN ('started', 'completed', 'failed', 'retrying')),
  error_message text,
  provider_used text,
  cost_cents integer DEFAULT 0,
  retry_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Cost tracking table for budget monitoring
CREATE TABLE IF NOT EXISTS cost_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- References auth.users via RLS
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  service_type text NOT NULL, -- 'ai_provider', 'blockchain', 'audio', 'storage'
  provider_name text, -- 'gemini', 'openai', 'claude', 'elevenlabs', 'algorand'
  cost_cents integer NOT NULL,
  usage_units integer, -- tokens, seconds, bytes, etc.
  unit_type text, -- 'tokens', 'seconds', 'bytes'
  report_id integer REFERENCES reports(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  billing_period text DEFAULT to_char(now(), 'YYYY-MM')
);

-- Data retention policies table
CREATE TABLE IF NOT EXISTS retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- References auth.users via RLS
  resource_type text NOT NULL, -- 'reports', 'audio_files', 'audit_logs'
  retention_days integer NOT NULL DEFAULT 90,
  auto_archive boolean DEFAULT true,
  auto_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- System health monitoring
CREATE TABLE IF NOT EXISTS system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_type text NOT NULL, -- 'counter', 'gauge', 'histogram'
  tags jsonb DEFAULT '{}',
  recorded_at timestamptz DEFAULT now()
);

-- Budget alerts table
CREATE TABLE IF NOT EXISTS budget_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- References auth.users via RLS
  alert_type text NOT NULL, -- 'monthly_limit', 'daily_limit', 'per_report_limit'
  threshold_cents integer NOT NULL,
  current_usage_cents integer DEFAULT 0,
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_processing_metrics_report_step 
ON processing_metrics (report_id, step_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cost_tracking_user_period 
ON cost_tracking (user_id, billing_period, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cost_tracking_project_service 
ON cost_tracking (project_id, service_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_health_metric_time 
ON system_health (metric_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_active 
ON budget_alerts (user_id, is_active, created_at DESC);

-- Enhanced RLS policies
ALTER TABLE processing_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- Processing metrics policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'processing_metrics' 
    AND policyname = 'processing_metrics_user_read'
  ) THEN
    CREATE POLICY "processing_metrics_user_read"
      ON processing_metrics
      FOR SELECT
      TO authenticated
      USING (
        report_id IN (
          SELECT r.id FROM reports r
          JOIN projects p ON r.project_id = p.id
          WHERE p.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Cost tracking policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cost_tracking' 
    AND policyname = 'cost_tracking_user_read'
  ) THEN
    CREATE POLICY "cost_tracking_user_read"
      ON cost_tracking
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cost_tracking' 
    AND policyname = 'cost_tracking_user_insert'
  ) THEN
    CREATE POLICY "cost_tracking_user_insert"
      ON cost_tracking
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Retention policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'retention_policies' 
    AND policyname = 'retention_policies_user_all'
  ) THEN
    CREATE POLICY "retention_policies_user_all"
      ON retention_policies
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Budget alerts policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'budget_alerts' 
    AND policyname = 'budget_alerts_user_all'
  ) THEN
    CREATE POLICY "budget_alerts_user_all"
      ON budget_alerts
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- System health is read-only for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_health' 
    AND policyname = 'system_health_authenticated_read'
  ) THEN
    CREATE POLICY "system_health_authenticated_read"
      ON system_health
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Add updated_at triggers with existence checks
DO $$
BEGIN
  -- Create function if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ language 'plpgsql';
  END IF;

  -- Create trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_retention_policies_updated_at'
  ) THEN
    CREATE TRIGGER update_retention_policies_updated_at
      BEFORE UPDATE ON retention_policies
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Enhanced audit logging function
CREATE OR REPLACE FUNCTION enhanced_audit_log(
  p_user_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_cost_cents integer DEFAULT 0,
  p_processing_time_ms integer DEFAULT NULL,
  p_provider_used text DEFAULT NULL,
  p_wallet_address text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO audit_logs (
    user_id, project_id, action, resource_type, resource_id,
    old_values, new_values, ip_address, user_agent,
    session_id, request_id, cost_cents, processing_time_ms, 
    provider_used, wallet_address
  ) VALUES (
    p_user_id, p_project_id, p_action, p_resource_type, p_resource_id,
    p_old_values, p_new_values, p_ip_address, p_user_agent,
    p_session_id, p_request_id, p_cost_cents, p_processing_time_ms, 
    p_provider_used, p_wallet_address
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cost tracking function
CREATE OR REPLACE FUNCTION track_cost(
  p_user_id uuid,
  p_project_id uuid,
  p_service_type text,
  p_provider_name text,
  p_cost_cents integer,
  p_usage_units integer DEFAULT NULL,
  p_unit_type text DEFAULT NULL,
  p_report_id integer DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  cost_id uuid;
  current_usage integer;
  alert_threshold integer;
BEGIN
  -- Insert cost record
  INSERT INTO cost_tracking (
    user_id, project_id, service_type, provider_name,
    cost_cents, usage_units, unit_type, report_id
  ) VALUES (
    p_user_id, p_project_id, p_service_type, p_provider_name,
    p_cost_cents, p_usage_units, p_unit_type, p_report_id
  ) RETURNING id INTO cost_id;
  
  -- Check budget alerts
  SELECT threshold_cents INTO alert_threshold
  FROM budget_alerts
  WHERE user_id = p_user_id 
    AND alert_type = 'monthly_limit'
    AND is_active = true
  LIMIT 1;
  
  IF alert_threshold IS NOT NULL THEN
    SELECT COALESCE(SUM(cost_cents), 0) INTO current_usage
    FROM cost_tracking
    WHERE user_id = p_user_id
      AND billing_period = to_char(now(), 'YYYY-MM');
    
    IF current_usage >= alert_threshold THEN
      -- Trigger alert (would integrate with notification system)
      UPDATE budget_alerts
      SET last_triggered_at = now(),
          current_usage_cents = current_usage
      WHERE user_id = p_user_id 
        AND alert_type = 'monthly_limit'
        AND is_active = true;
    END IF;
  END IF;
  
  RETURN cost_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Data cleanup function for retention policies
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
DECLARE
  policy_record record;
  cutoff_date timestamptz;
BEGIN
  -- Process each retention policy
  FOR policy_record IN 
    SELECT * FROM retention_policies WHERE auto_delete = true
  LOOP
    cutoff_date := now() - (policy_record.retention_days || ' days')::interval;
    
    CASE policy_record.resource_type
      WHEN 'reports' THEN
        DELETE FROM reports 
        WHERE created_at < cutoff_date
          AND project_id IN (
            SELECT id FROM projects WHERE user_id = policy_record.user_id
          );
          
      WHEN 'audit_logs' THEN
        DELETE FROM audit_logs
        WHERE created_at < cutoff_date
          AND (user_id = policy_record.user_id OR project_id IN (
            SELECT id FROM projects WHERE user_id = policy_record.user_id
          ));
          
      WHEN 'audio_files' THEN
        -- Mark audio files for deletion (would be handled by storage cleanup job)
        UPDATE reports 
        SET audio_url = NULL
        WHERE created_at < cutoff_date
          AND audio_url IS NOT NULL
          AND project_id IN (
            SELECT id FROM projects WHERE user_id = policy_record.user_id
          );
    END CASE;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- System health metrics function
CREATE OR REPLACE FUNCTION record_system_metric(
  p_metric_name text,
  p_metric_value numeric,
  p_metric_type text DEFAULT 'gauge',
  p_tags jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
  metric_id uuid;
BEGIN
  INSERT INTO system_health (metric_name, metric_value, metric_type, tags)
  VALUES (p_metric_name, p_metric_value, p_metric_type, p_tags)
  RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Processing step tracking function
CREATE OR REPLACE FUNCTION track_processing_step(
  p_report_id integer,
  p_step_name text,
  p_status text,
  p_duration_ms integer DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_provider_used text DEFAULT NULL,
  p_cost_cents integer DEFAULT 0,
  p_retry_count integer DEFAULT 0,
  p_metadata jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
  metric_id uuid;
BEGIN
  INSERT INTO processing_metrics (
    report_id, step_name, status, duration_ms, error_message,
    provider_used, cost_cents, retry_count, metadata,
    completed_at
  ) VALUES (
    p_report_id, p_step_name, p_status, p_duration_ms, p_error_message,
    p_provider_used, p_cost_cents, p_retry_count, p_metadata,
    CASE WHEN p_status IN ('completed', 'failed') THEN now() ELSE NULL END
  ) RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;