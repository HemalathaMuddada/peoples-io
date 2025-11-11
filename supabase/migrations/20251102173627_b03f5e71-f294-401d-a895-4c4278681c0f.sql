-- Add work preferences columns to candidate_profiles
ALTER TABLE public.candidate_profiles
ADD COLUMN IF NOT EXISTS company_culture_preferences TEXT[],
ADD COLUMN IF NOT EXISTS company_values TEXT[],
ADD COLUMN IF NOT EXISTS work_environment_preference TEXT CHECK (work_environment_preference IN ('remote', 'hybrid', 'onsite', 'flexible')),
ADD COLUMN IF NOT EXISTS team_size_preference TEXT CHECK (team_size_preference IN ('startup', 'small', 'medium', 'large', 'enterprise')),
ADD COLUMN IF NOT EXISTS work_style_preferences TEXT[],
ADD COLUMN IF NOT EXISTS video_intro_url TEXT,
ADD COLUMN IF NOT EXISTS video_intro_duration INTEGER;

-- Create portfolio/projects table
CREATE TABLE IF NOT EXISTS public.candidate_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  project_url TEXT,
  github_url TEXT,
  image_url TEXT,
  technologies TEXT[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.candidate_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
CREATE POLICY "Users can view their own projects"
  ON public.candidate_projects FOR SELECT
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own projects"
  ON public.candidate_projects FOR INSERT
  WITH CHECK (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own projects"
  ON public.candidate_projects FOR UPDATE
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own projects"
  ON public.candidate_projects FOR DELETE
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

-- Create certifications table
CREATE TABLE IF NOT EXISTS public.candidate_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  certification_name TEXT NOT NULL,
  issuing_organization TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  credential_id TEXT,
  credential_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on certifications
ALTER TABLE public.candidate_certifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for certifications
CREATE POLICY "Users can manage their own certifications"
  ON public.candidate_certifications FOR ALL
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

-- Create skill endorsements table
CREATE TABLE IF NOT EXISTS public.skill_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  endorsed_by TEXT,
  endorsement_date DATE DEFAULT CURRENT_DATE,
  endorsement_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on endorsements
ALTER TABLE public.skill_endorsements ENABLE ROW LEVEL SECURITY;

-- RLS policies for endorsements
CREATE POLICY "Users can manage their skill endorsements"
  ON public.skill_endorsements FOR ALL
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

-- Admins can view all projects
CREATE POLICY "Admins can view all projects"
  ON public.candidate_projects FOR SELECT
  USING (
    has_role(auth.uid(), 'platform_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.candidate_profiles cp
      WHERE cp.id = candidate_projects.profile_id
      AND has_role(auth.uid(), 'org_admin'::app_role, cp.org_id)
    )
  );

-- Admins can view all certifications
CREATE POLICY "Admins can view all certifications"
  ON public.candidate_certifications FOR SELECT
  USING (
    has_role(auth.uid(), 'platform_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.candidate_profiles cp
      WHERE cp.id = candidate_certifications.profile_id
      AND has_role(auth.uid(), 'org_admin'::app_role, cp.org_id)
    )
  );

-- Create trigger for updating updated_at on projects
CREATE TRIGGER update_candidate_projects_updated_at
  BEFORE UPDATE ON public.candidate_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updating updated_at on certifications
CREATE TRIGGER update_candidate_certifications_updated_at
  BEFORE UPDATE ON public.candidate_certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();