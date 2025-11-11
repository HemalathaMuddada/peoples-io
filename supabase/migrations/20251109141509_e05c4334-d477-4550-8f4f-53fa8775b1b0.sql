-- Drop the restrictive candidate-only policy
DROP POLICY IF EXISTS "Users can assign themselves candidate role during signup" ON public.user_roles;

-- Allow users to assign themselves these roles during signup
CREATE POLICY "Users can assign themselves roles during signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role IN ('candidate'::app_role, 'recruiter'::app_role, 'agency_admin'::app_role, 'org_admin'::app_role, 'hiring_manager'::app_role, 'mentor'::app_role)
);