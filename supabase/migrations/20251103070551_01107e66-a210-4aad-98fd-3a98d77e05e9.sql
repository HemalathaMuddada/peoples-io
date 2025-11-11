-- Create linkedin_connections table to store user's LinkedIn network
CREATE TABLE IF NOT EXISTS public.linkedin_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  linkedin_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  headline TEXT,
  current_company TEXT,
  current_title TEXT,
  profile_url TEXT,
  avatar_url TEXT,
  location TEXT,
  connection_degree INTEGER NOT NULL DEFAULT 1,
  mutual_connections INTEGER DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id, linkedin_id)
);

-- Create connection_job_matches table to link connections to job opportunities
CREATE TABLE IF NOT EXISTS public.connection_job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.linkedin_connections(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL CHECK (match_type IN ('same_company', 'same_industry', 'mutual_connection', 'alumni')),
  match_strength INTEGER DEFAULT 50 CHECK (match_strength >= 0 AND match_strength <= 100),
  notes TEXT,
  outreach_status TEXT DEFAULT 'not_contacted' CHECK (outreach_status IN ('not_contacted', 'contacted', 'responded', 'introduced', 'declined')),
  contacted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(job_posting_id, connection_id)
);

-- Enable RLS
ALTER TABLE public.linkedin_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_job_matches ENABLE ROW LEVEL SECURITY;

-- RLS policies for linkedin_connections
CREATE POLICY "Users can view their own connections"
  ON public.linkedin_connections FOR SELECT
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own connections"
  ON public.linkedin_connections FOR ALL
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

-- RLS policies for connection_job_matches
CREATE POLICY "Users can view their connection matches"
  ON public.connection_job_matches FOR SELECT
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their connection matches"
  ON public.connection_job_matches FOR ALL
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_linkedin_connections_profile_id ON public.linkedin_connections(profile_id);
CREATE INDEX idx_linkedin_connections_company ON public.linkedin_connections(current_company);
CREATE INDEX idx_connection_job_matches_job_posting ON public.connection_job_matches(job_posting_id);
CREATE INDEX idx_connection_job_matches_profile ON public.connection_job_matches(profile_id);
CREATE INDEX idx_connection_job_matches_strength ON public.connection_job_matches(match_strength DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_connection_job_matches_updated_at
  BEFORE UPDATE ON public.connection_job_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();