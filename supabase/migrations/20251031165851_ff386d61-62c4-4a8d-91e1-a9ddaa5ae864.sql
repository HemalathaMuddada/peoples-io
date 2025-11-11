-- Fix Critical Security Issues (Error Level) - Corrected

-- ============================================================
-- 1. Fix: Messages Table Lacks DELETE Policy
-- ============================================================
-- Allow users to delete their own messages in conversations they own
CREATE POLICY "Users can delete messages in their conversations"
  ON public.messages
  FOR DELETE
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 2. Fix: Full Names Visible to All Organization Members
-- ============================================================
-- Drop the overly permissive org-wide policy that exposes PII
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;

-- Users can only view their own full profile (with full_name, email)
-- This policy already exists: "Users can view their own profile"
-- But we need to ensure it's the only SELECT policy

-- Create a directory view with minimal info for org-wide visibility
CREATE OR REPLACE VIEW public.profiles_directory AS
  SELECT 
    id,
    avatar_url,
    org_id,
    created_at
  FROM public.profiles;

-- Grant access to the directory view
GRANT SELECT ON public.profiles_directory TO authenticated;

COMMENT ON VIEW public.profiles_directory IS 'Public directory of profiles without PII like names and emails. Access controlled by underlying table RLS.';

-- ============================================================
-- 3. Fix: Resume Upload Size Limit Only Client-Side
-- ============================================================
-- Set server-side file size limit to 10MB (10485760 bytes)
UPDATE storage.buckets
SET 
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- .docx
    'application/msword', -- .doc
    'text/plain'
  ]
WHERE id = 'resumes';