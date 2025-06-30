/*
  # Remove wallet authentication components

  1. Tables to Remove
    - `user_wallets` table and all related data
  
  2. Functions to Remove
    - Any wallet-related functions
  
  3. Columns to Remove
    - `wallet_address` column from `audit_logs` table
  
  4. Cleanup
    - Remove any wallet-related policies and indexes
*/

-- Drop the user_wallets table if it exists
DROP TABLE IF EXISTS "public"."user_wallets";

-- Remove wallet_address column from audit_logs if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'wallet_address'
  ) THEN
    ALTER TABLE "public"."audit_logs" DROP COLUMN "wallet_address";
  END IF;
END $$;

-- Drop any wallet-related functions if they exist
DROP FUNCTION IF EXISTS "public"."get_user_by_wallet"(p_wallet_address text, p_wallet_type text);
DROP FUNCTION IF EXISTS "public"."link_wallet_to_user"(p_user_id uuid, p_wallet_address text, p_wallet_type text, p_is_primary boolean);
DROP FUNCTION IF EXISTS "public"."verify_wallet_signature"(p_address text, p_message text, p_signature text);

-- Clean up any remaining wallet-related policies (if they exist)
DO $$
BEGIN
  -- Remove policies that might reference wallet tables
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_wallets'
  ) THEN
    DROP POLICY IF EXISTS "Users can delete own wallets" ON "public"."user_wallets";
    DROP POLICY IF EXISTS "Users can insert own wallets" ON "public"."user_wallets";
    DROP POLICY IF EXISTS "Users can read own wallets" ON "public"."user_wallets";
    DROP POLICY IF EXISTS "Users can update own wallets" ON "public"."user_wallets";
  END IF;
END $$;