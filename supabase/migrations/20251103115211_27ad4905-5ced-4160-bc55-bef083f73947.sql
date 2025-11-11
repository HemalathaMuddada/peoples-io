-- Allow users to view mentor profiles across organizations when mentors are available

-- Drop the restrictive policy that only allows viewing profiles in same org
DROP POLICY IF EXISTS "Users can view public profiles in their org" ON public.candidate_profiles;

-- Create new policy: Users can view mentor profiles if they are available for mentorship (cross-org)
CREATE POLICY "Users can view available mentor profiles"
ON public.candidate_profiles
FOR SELECT
USING (
  is_available_for_mentorship = true 
  OR org_id = get_user_org(auth.uid())
);

-- Keep policy for viewing own profile
-- (already exists: "Users can view their own profile")
