-- Add team_id to job_postings for team-based filtering
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add team_id to job_applications for team-based filtering
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add team_id to company_invitations for team-based filtering
ALTER TABLE public.company_invitations ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_postings_team_id ON public.job_postings(team_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_team_id ON public.job_applications(team_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_team_id ON public.company_invitations(team_id);