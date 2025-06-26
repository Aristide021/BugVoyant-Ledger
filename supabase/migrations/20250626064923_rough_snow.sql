/*
  # Wallet Authentication Support

  1. New Tables
    - `user_wallets` - Links users to their wallet addresses
    
  2. Security
    - Enable RLS on user_wallets table
    - Add policies for wallet management
    
  3. Functions
    - Helper functions for wallet authentication
*/

-- User wallets table for Web3 authentication
CREATE TABLE IF NOT EXISTS user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- References auth.users
  wallet_address text NOT NULL,
  wallet_type text NOT NULL DEFAULT 'algorand', -- 'algorand', 'ethereum', etc.
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  
  UNIQUE(wallet_address, wallet_type),
  UNIQUE(user_id, wallet_type, is_primary) -- Only one primary wallet per type per user
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id 
ON user_wallets (user_id);

CREATE INDEX IF NOT EXISTS idx_user_wallets_address 
ON user_wallets (wallet_address, wallet_type);

-- Enable RLS
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own wallets"
  ON user_wallets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own wallets"
  ON user_wallets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own wallets"
  ON user_wallets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own wallets"
  ON user_wallets
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to get user by wallet address
CREATE OR REPLACE FUNCTION get_user_by_wallet(
  p_wallet_address text,
  p_wallet_type text DEFAULT 'algorand'
) RETURNS uuid AS $$
DECLARE
  user_uuid uuid;
BEGIN
  SELECT user_id INTO user_uuid
  FROM user_wallets
  WHERE wallet_address = p_wallet_address
    AND wallet_type = p_wallet_type;
    
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to link wallet to user
CREATE OR REPLACE FUNCTION link_wallet_to_user(
  p_user_id uuid,
  p_wallet_address text,
  p_wallet_type text DEFAULT 'algorand',
  p_is_primary boolean DEFAULT false
) RETURNS uuid AS $$
DECLARE
  wallet_id uuid;
BEGIN
  -- If setting as primary, unset other primary wallets of same type
  IF p_is_primary THEN
    UPDATE user_wallets 
    SET is_primary = false 
    WHERE user_id = p_user_id 
      AND wallet_type = p_wallet_type 
      AND is_primary = true;
  END IF;
  
  -- Insert or update wallet
  INSERT INTO user_wallets (
    user_id, wallet_address, wallet_type, is_primary, last_used_at
  ) VALUES (
    p_user_id, p_wallet_address, p_wallet_type, p_is_primary, now()
  )
  ON CONFLICT (wallet_address, wallet_type) 
  DO UPDATE SET 
    last_used_at = now(),
    is_primary = EXCLUDED.is_primary
  RETURNING id INTO wallet_id;
  
  RETURN wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update audit logs to track wallet authentication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'wallet_address'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN wallet_address text;
  END IF;
END $$;

-- Enhanced audit logging for wallet events
CREATE OR REPLACE FUNCTION log_wallet_event(
  p_user_id uuid,
  p_action text,
  p_wallet_address text,
  p_wallet_type text DEFAULT 'algorand',
  p_metadata jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, wallet_address, created_at
  ) VALUES (
    p_user_id, p_action, 'wallet', p_wallet_address,
    jsonb_build_object(
      'wallet_type', p_wallet_type,
      'metadata', p_metadata
    ),
    p_wallet_address, now()
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;