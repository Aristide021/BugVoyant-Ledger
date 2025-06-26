/*
  # Add unique constraint for idempotent webhook processing

  1. Database Changes
    - Add unique constraint on (project_id, sentry_issue_id) to prevent duplicate reports
    - This ensures that multiple webhooks for the same Sentry issue don't create duplicate records

  2. Benefits
    - Prevents duplicate post-mortem reports from webhook retries
    - Ensures idempotent webhook processing
    - Maintains data integrity across webhook failures and retries

  3. Migration Safety
    - Uses IF NOT EXISTS to prevent errors on re-run
    - Safe to apply to existing databases with data
*/

-- Add unique constraint to prevent duplicate reports for the same Sentry issue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reports_unique_issue_per_project' 
    AND table_name = 'reports'
  ) THEN
    ALTER TABLE reports
    ADD CONSTRAINT reports_unique_issue_per_project
    UNIQUE (project_id, sentry_issue_id);
  END IF;
END $$;

-- Add index for better query performance on the unique constraint
CREATE INDEX IF NOT EXISTS idx_reports_project_sentry_issue 
ON reports (project_id, sentry_issue_id);