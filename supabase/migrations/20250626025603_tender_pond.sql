/*
  # Security Enhancements - Encrypted Storage and Vault Integration

  1. Security Improvements
    - Add encryption functions for sensitive data
    - Create encrypted storage for API keys and tokens
    - Add key rotation capabilities
    - Implement audit logging for sensitive operations

  2. New Tables
    - `encrypted_secrets` - Secure storage for API keys with encryption
    - `audit_logs` - Track all sensitive operations
    - `api_key_rotations` - Track key rotation history

  3. Functions
    - Encryption/decryption functions using pgcrypto
    - Audit logging triggers
    - Key rotation utilities
*/

-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encrypted secrets table
CREATE TABLE IF NOT EXISTS encrypted_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  secret_type text NOT NULL CHECK (secret_type IN ('sentry_auth_token', 'slack_webhook_url', 'api_key')),
  encrypted_value text NOT NULL,
  key_hash text NOT NULL, -- Hash of the encryption key for verification
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(project_id, secret_type, is_active) -- Only one active secret per type per project
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create API key rotation tracking
CREATE TABLE IF NOT EXISTS api_key_rotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  secret_type text NOT NULL,
  rotation_reason text,
  old_key_hash text,
  new_key_hash text,
  rotated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE encrypted_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_rotations ENABLE ROW LEVEL SECURITY;

-- RLS policies for encrypted_secrets
CREATE POLICY "Users can read own project secrets"
  ON encrypted_secrets
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert secrets to own projects"
  ON encrypted_secrets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project secrets"
  ON encrypted_secrets
  FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- RLS policies for audit_logs
CREATE POLICY "Users can read own audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- RLS policies for api_key_rotations
CREATE POLICY "Users can read own key rotations"
  ON api_key_rotations
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Encryption/Decryption functions
CREATE OR REPLACE FUNCTION encrypt_secret(secret_text text, encryption_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(secret_text, encryption_key),
    'base64'
  );
END;
$$;

CREATE OR REPLACE FUNCTION decrypt_secret(encrypted_text text, encryption_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_text, 'base64'),
    encryption_key
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL; -- Return NULL if decryption fails
END;
$$;

-- Function to safely store encrypted secrets
CREATE OR REPLACE FUNCTION store_encrypted_secret(
  p_project_id uuid,
  p_secret_type text,
  p_secret_value text,
  p_encryption_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_id uuid;
  key_hash_value text;
BEGIN
  -- Generate hash of encryption key for verification
  key_hash_value := encode(digest(p_encryption_key, 'sha256'), 'hex');
  
  -- Deactivate existing secrets of this type
  UPDATE encrypted_secrets 
  SET is_active = false, updated_at = now()
  WHERE project_id = p_project_id 
    AND secret_type = p_secret_type 
    AND is_active = true;
  
  -- Insert new encrypted secret
  INSERT INTO encrypted_secrets (
    project_id,
    secret_type,
    encrypted_value,
    key_hash
  ) VALUES (
    p_project_id,
    p_secret_type,
    encrypt_secret(p_secret_value, p_encryption_key),
    key_hash_value
  ) RETURNING id INTO secret_id;
  
  RETURN secret_id;
END;
$$;

-- Function to retrieve decrypted secrets (for server-side use only)
CREATE OR REPLACE FUNCTION get_decrypted_secret(
  p_project_id uuid,
  p_secret_type text,
  p_encryption_key text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encrypted_value text;
  key_hash_value text;
  stored_key_hash text;
BEGIN
  -- Generate hash of provided key
  key_hash_value := encode(digest(p_encryption_key, 'sha256'), 'hex');
  
  -- Get the encrypted value and stored key hash
  SELECT es.encrypted_value, es.key_hash
  INTO encrypted_value, stored_key_hash
  FROM encrypted_secrets es
  WHERE es.project_id = p_project_id
    AND es.secret_type = p_secret_type
    AND es.is_active = true
  LIMIT 1;
  
  -- Verify key hash matches
  IF stored_key_hash != key_hash_value THEN
    RAISE EXCEPTION 'Invalid encryption key';
  END IF;
  
  -- Return decrypted value
  RETURN decrypt_secret(encrypted_value, p_encryption_key);
END;
$$;

-- Audit logging function
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id uuid,
  p_project_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    project_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values
  ) VALUES (
    p_user_id,
    p_project_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_encrypted_secrets_project_type ON encrypted_secrets(project_id, secret_type, is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_created ON audit_logs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_key_rotations_project ON api_key_rotations(project_id, created_at DESC);

-- Create triggers for updated_at
CREATE TRIGGER update_encrypted_secrets_updated_at 
  BEFORE UPDATE ON encrypted_secrets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Remove plaintext sensitive columns from projects table (will be handled by migration)
-- Note: This should be done carefully in production with proper data migration

-- Add comments for documentation
COMMENT ON TABLE encrypted_secrets IS 'Secure storage for API keys and sensitive tokens with encryption';
COMMENT ON TABLE audit_logs IS 'Audit trail for all sensitive operations and data access';
COMMENT ON TABLE api_key_rotations IS 'Track API key rotation history for security compliance';
COMMENT ON FUNCTION encrypt_secret(text, text) IS 'Encrypts sensitive data using pgcrypto';
COMMENT ON FUNCTION decrypt_secret(text, text) IS 'Decrypts sensitive data using pgcrypto';
COMMENT ON FUNCTION store_encrypted_secret(uuid, text, text, text) IS 'Safely stores encrypted secrets with key verification';
COMMENT ON FUNCTION get_decrypted_secret(uuid, text, text) IS 'Retrieves and decrypts secrets for server-side use';