-- Create client_recruiter_assignments table
CREATE TABLE IF NOT EXISTS public.client_recruiter_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.agency_client_relationships(id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(relationship_id, recruiter_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_client_recruiter_assignments_relationship 
  ON public.client_recruiter_assignments(relationship_id);
CREATE INDEX IF NOT EXISTS idx_client_recruiter_assignments_recruiter 
  ON public.client_recruiter_assignments(recruiter_id);

-- Enable RLS
ALTER TABLE public.client_recruiter_assignments ENABLE ROW LEVEL SECURITY;

-- Agency admins can manage assignments for their clients
CREATE POLICY "Agency admins can manage recruiter assignments"
  ON public.client_recruiter_assignments
  FOR ALL
  USING (
    relationship_id IN (
      SELECT id FROM public.agency_client_relationships
      WHERE agency_org_id IN (
        SELECT org_id FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'agency_admin'
      )
    )
  )
  WITH CHECK (
    relationship_id IN (
      SELECT id FROM public.agency_client_relationships
      WHERE agency_org_id IN (
        SELECT org_id FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'agency_admin'
      )
    )
  );

-- Recruiters can view their own assignments
CREATE POLICY "Recruiters can view their assignments"
  ON public.client_recruiter_assignments
  FOR SELECT
  USING (
    recruiter_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Platform admins can view all assignments
CREATE POLICY "Platform admins can view all assignments"
  ON public.client_recruiter_assignments
  FOR SELECT
  USING (
    has_role(auth.uid(), 'platform_admin'::app_role)
  );