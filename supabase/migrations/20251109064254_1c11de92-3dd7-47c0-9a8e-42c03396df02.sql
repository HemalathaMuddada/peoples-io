-- Create agency-client relationships table
CREATE TABLE IF NOT EXISTS public.agency_client_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employer_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  contract_terms TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(agency_org_id, employer_org_id),
  CONSTRAINT end_date_after_start CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Add indexes for performance
CREATE INDEX idx_agency_client_relationships_agency ON public.agency_client_relationships(agency_org_id);
CREATE INDEX idx_agency_client_relationships_employer ON public.agency_client_relationships(employer_org_id);
CREATE INDEX idx_agency_client_relationships_status ON public.agency_client_relationships(status);

-- Add columns to job_postings to track agency relationships
ALTER TABLE public.job_postings 
ADD COLUMN IF NOT EXISTS posting_org_id UUID REFERENCES public.organizations(id),
ADD COLUMN IF NOT EXISTS employer_org_id UUID REFERENCES public.organizations(id),
ADD COLUMN IF NOT EXISTS posted_by_agency BOOLEAN DEFAULT false;

-- Update existing job_postings to use org_id as employer_org_id if not already set
UPDATE public.job_postings 
SET employer_org_id = org_id 
WHERE employer_org_id IS NULL;

-- Enable RLS on agency_client_relationships
ALTER TABLE public.agency_client_relationships ENABLE ROW LEVEL SECURITY;

-- Policy: Employers can view relationships for their organization
CREATE POLICY "Employers can view their agency relationships"
ON public.agency_client_relationships
FOR SELECT
USING (
  employer_org_id IN (
    SELECT org_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('org_admin', 'hiring_manager')
  )
);

-- Policy: Agencies can view their client relationships
CREATE POLICY "Agencies can view their client relationships"
ON public.agency_client_relationships
FOR SELECT
USING (
  agency_org_id IN (
    SELECT org_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('agency_admin', 'recruiter')
  )
);

-- Policy: Employers can create relationship requests
CREATE POLICY "Employers can create agency relationships"
ON public.agency_client_relationships
FOR INSERT
WITH CHECK (
  employer_org_id IN (
    SELECT org_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'org_admin'
  )
  AND created_by = auth.uid()
);

-- Policy: Agencies can create relationship requests
CREATE POLICY "Agencies can create client relationships"
ON public.agency_client_relationships
FOR INSERT
WITH CHECK (
  agency_org_id IN (
    SELECT org_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'agency_admin'
  )
  AND created_by = auth.uid()
);

-- Policy: Both parties can update relationships
CREATE POLICY "Parties can update their relationships"
ON public.agency_client_relationships
FOR UPDATE
USING (
  agency_org_id IN (
    SELECT org_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'agency_admin'
  )
  OR employer_org_id IN (
    SELECT org_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'org_admin'
  )
);

-- Policy: Platform admins can manage all relationships
CREATE POLICY "Platform admins can manage all relationships"
ON public.agency_client_relationships
FOR ALL
USING (has_role(auth.uid(), 'platform_admin'))
WITH CHECK (has_role(auth.uid(), 'platform_admin'));

-- Update job_postings RLS policies to handle agency posting
DROP POLICY IF EXISTS "Users in org can manage jobs" ON public.job_postings;
DROP POLICY IF EXISTS "Platform admins access all" ON public.job_postings;

-- New policy: Allow agencies to post jobs for their clients
CREATE POLICY "Agencies can post for clients"
ON public.job_postings
FOR INSERT
WITH CHECK (
  -- Agency posting for a client
  (
    posted_by_agency = true
    AND posting_org_id IN (
      SELECT org_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('agency_admin', 'recruiter')
    )
    AND employer_org_id IN (
      SELECT employer_org_id 
      FROM public.agency_client_relationships
      WHERE agency_org_id = posting_org_id
      AND status = 'active'
    )
  )
  OR
  -- Direct employer posting
  (
    posted_by_agency = false
    AND org_id IN (
      SELECT org_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('org_admin', 'hiring_manager')
    )
  )
);

-- New policy: View jobs based on organization role
CREATE POLICY "View jobs based on role"
ON public.job_postings
FOR SELECT
USING (
  -- All authenticated users can view jobs (for candidate matching)
  auth.uid() IS NOT NULL
  OR
  -- Direct employers can see their jobs
  org_id IN (
    SELECT org_id FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
  OR
  -- Agencies can see jobs they posted
  (
    posted_by_agency = true
    AND posting_org_id IN (
      SELECT org_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('agency_admin', 'recruiter')
    )
  )
  OR
  -- Employers can see jobs posted for them by agencies
  (
    posted_by_agency = true
    AND employer_org_id IN (
      SELECT org_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('org_admin', 'hiring_manager')
    )
  )
  OR
  -- Platform admins can see all
  has_role(auth.uid(), 'platform_admin')
);

-- Policy: Update jobs
CREATE POLICY "Update jobs based on role"
ON public.job_postings
FOR UPDATE
USING (
  -- Direct employers can update their jobs
  (
    posted_by_agency = false
    AND org_id IN (
      SELECT org_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('org_admin', 'hiring_manager')
    )
  )
  OR
  -- Agencies can update jobs they posted
  (
    posted_by_agency = true
    AND posting_org_id IN (
      SELECT org_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('agency_admin', 'recruiter')
    )
  )
  OR
  -- Platform admins can update all
  has_role(auth.uid(), 'platform_admin')
);

-- Policy: Delete jobs
CREATE POLICY "Delete jobs based on role"
ON public.job_postings
FOR DELETE
USING (
  -- Direct employers can delete their jobs
  (
    posted_by_agency = false
    AND org_id IN (
      SELECT org_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'org_admin'
    )
  )
  OR
  -- Agencies can delete jobs they posted (with client permission implied)
  (
    posted_by_agency = true
    AND posting_org_id IN (
      SELECT org_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'agency_admin'
    )
  )
  OR
  -- Platform admins can delete all
  has_role(auth.uid(), 'platform_admin')
);

-- Create updated_at trigger for agency_client_relationships
CREATE TRIGGER update_agency_client_relationships_updated_at
BEFORE UPDATE ON public.agency_client_relationships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.agency_client_relationships IS 'Manages relationships between agencies and their employer clients for job posting purposes';