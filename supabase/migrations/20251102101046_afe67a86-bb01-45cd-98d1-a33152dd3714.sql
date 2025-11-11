-- Add policy for platform admins to view all profiles
CREATE POLICY "Platform admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin'::app_role) OR 
  has_role(auth.uid(), 'org_admin'::app_role, org_id)
);

-- Add policy for platform admins to view all user roles
CREATE POLICY "Platform admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin'::app_role) OR 
  has_role(auth.uid(), 'org_admin'::app_role, org_id)
);

-- Add policy for platform admins to view all candidate profiles
CREATE POLICY "Platform admins can view all candidate profiles"
ON public.candidate_profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin'::app_role) OR 
  has_role(auth.uid(), 'org_admin'::app_role, org_id)
);