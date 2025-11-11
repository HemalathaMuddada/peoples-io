-- Allow viewing mentors across orgs (Postgres <15 does not support IF NOT EXISTS for policies)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view mentor roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view available mentors' profiles" ON public.profiles;

-- Policy: Anyone authenticated can read mentor-role rows in user_roles
CREATE POLICY "Users can view mentor roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (role = 'mentor'::app_role);

-- Policy: Allow viewing basic profile rows for users who are mentors and available
CREATE POLICY "Users can view available mentors' profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(id, 'mentor'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.candidate_profiles cp
    WHERE cp.user_id = profiles.id AND cp.is_available_for_mentorship = true
  )
);
