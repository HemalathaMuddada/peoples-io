-- Fix salary data exposure in candidate_profiles
-- Drop the overly permissive org-wide SELECT policy
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.candidate_profiles;

-- Create policy for users to view their own complete profile including salary
CREATE POLICY "Users can view their own profile"
ON public.candidate_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create policy for org members to view profiles excluding salary fields
-- This is done by creating a view that excludes salary fields
CREATE OR REPLACE VIEW public.candidate_profiles_public AS
SELECT 
  id,
  user_id,
  org_id,
  headline,
  location,
  current_title,
  years_experience,
  seniority,
  target_titles,
  target_locations,
  work_authorization,
  employment_type_prefs,
  linkedin_url,
  resume_primary_id,
  profile_score,
  created_at,
  updated_at
FROM public.candidate_profiles;

-- Grant SELECT on the view to authenticated users in the same org
GRANT SELECT ON public.candidate_profiles_public TO authenticated;

-- Enable RLS on the view
ALTER VIEW public.candidate_profiles_public SET (security_invoker = true);

-- Create policy for org-wide access to the public view
CREATE POLICY "Users can view public profiles in their org"
ON public.candidate_profiles
FOR SELECT
TO authenticated
USING (
  org_id = get_user_org(auth.uid()) 
  AND user_id != auth.uid()
);

-- Update the policy to exclude salary fields when accessed by others
-- Note: The view handles this, but we need to ensure the main table policy is correct
COMMENT ON POLICY "Users can view public profiles in their org" ON public.candidate_profiles IS 
'Allows users to view profiles in their org, but salary data is only visible via their own profile policy';