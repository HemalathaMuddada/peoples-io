-- Add platform_admin policies for admin dashboard access

-- Allow platform admins to view all resumes
CREATE POLICY "Platform admins can view all resumes"
ON public.resumes
FOR SELECT
USING (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'org_admin'::app_role, org_id)
);

-- Allow platform admins to view all job applications
CREATE POLICY "Platform admins can view all applications"
ON public.job_applications
FOR SELECT
USING (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM candidate_profiles cp
    WHERE cp.id = job_applications.profile_id
    AND has_role(auth.uid(), 'org_admin'::app_role, cp.org_id)
  )
);

-- Allow platform admins to view all conversations
CREATE POLICY "Platform admins can view all conversations"
ON public.conversations
FOR SELECT
USING (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'org_admin'::app_role, org_id)
);

-- Allow platform admins to view all messages
CREATE POLICY "Platform admins can view all messages"
ON public.messages
FOR SELECT
USING (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR conversation_id IN (
    SELECT id FROM conversations
    WHERE has_role(auth.uid(), 'org_admin'::app_role, org_id)
  )
);

-- Allow platform admins to view all organizations
CREATE POLICY "Platform admins can view all organizations"
ON public.organizations
FOR SELECT
USING (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'org_admin'::app_role, id)
);