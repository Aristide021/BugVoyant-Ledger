/*
  # Create audio storage setup

  1. Storage Setup Notes
    - Storage buckets must be created via Supabase Dashboard or API
    - RLS policies on storage.objects require superuser privileges
    - This migration creates helper functions and documentation

  2. Manual Setup Required
    - Create 'audio-summaries' bucket in Supabase Dashboard
    - Set bucket to public: true
    - Storage policies will be automatically handled by Supabase

  3. Alternative: Use Supabase API to create bucket programmatically
*/

-- Create a function to help with audio file management
CREATE OR REPLACE FUNCTION get_audio_file_path(report_id integer)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'reports/' || report_id || '_' || extract(epoch from now()) || '.mp3';
END;
$$;

-- Create a function to validate audio URLs
CREATE OR REPLACE FUNCTION is_valid_audio_url(url text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN url IS NOT NULL 
    AND url != '' 
    AND (url LIKE 'https://%.supabase.co/storage/v1/object/public/audio-summaries/%'
         OR url LIKE 'https://%.supabase.in/storage/v1/object/public/audio-summaries/%');
END;
$$;

-- Add a check constraint to ensure audio URLs are valid when present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reports_audio_url_check' 
    AND table_name = 'reports'
  ) THEN
    ALTER TABLE reports 
    ADD CONSTRAINT reports_audio_url_check 
    CHECK (audio_url IS NULL OR is_valid_audio_url(audio_url));
  END IF;
END $$;

-- Create an index on audio_url for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_audio_url ON reports(audio_url) WHERE audio_url IS NOT NULL;

-- Add comments for documentation
COMMENT ON FUNCTION get_audio_file_path(integer) IS 'Generates a unique file path for audio files based on report ID and timestamp';
COMMENT ON FUNCTION is_valid_audio_url(text) IS 'Validates that audio URLs point to the correct Supabase storage bucket';
COMMENT ON CONSTRAINT reports_audio_url_check ON reports IS 'Ensures audio URLs are valid Supabase storage URLs when present';

/*
  MANUAL SETUP REQUIRED:
  
  1. Go to Supabase Dashboard > Storage
  2. Create a new bucket named 'audio-summaries'
  3. Set the bucket to public: true
  4. The bucket will automatically have the correct RLS policies
  
  Alternatively, use the Supabase JavaScript client in your application:
  
  const { data, error } = await supabase.storage.createBucket('audio-summaries', {
    public: true,
    allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
    fileSizeLimit: 10485760 // 10MB
  });
*/