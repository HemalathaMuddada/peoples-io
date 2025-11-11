-- Create company_insights table for inside scoops
CREATE TABLE IF NOT EXISTS public.company_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  insight_type TEXT NOT NULL, -- interview_process, timeline, hiring_manager, culture, layoffs, hiring_freeze
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT, -- employee, candidate, public, verified
  verified BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  reported_count INTEGER DEFAULT 0,
  submitted_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb, -- for additional structured data
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create company_reviews table
CREATE TABLE IF NOT EXISTS public.company_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  job_title TEXT,
  employment_status TEXT, -- current, former
  rating_overall INTEGER NOT NULL CHECK (rating_overall >= 1 AND rating_overall <= 5),
  rating_culture INTEGER CHECK (rating_culture >= 1 AND rating_culture <= 5),
  rating_compensation INTEGER CHECK (rating_compensation >= 1 AND rating_compensation <= 5),
  rating_work_life INTEGER CHECK (rating_work_life >= 1 AND rating_work_life <= 5),
  rating_management INTEGER CHECK (rating_management >= 1 AND rating_management <= 5),
  rating_career_growth INTEGER CHECK (rating_career_growth >= 1 AND rating_career_growth <= 5),
  pros TEXT,
  cons TEXT,
  advice_to_management TEXT,
  would_recommend BOOLEAN,
  helpful_count INTEGER DEFAULT 0,
  reported_count INTEGER DEFAULT 0,
  submitted_by UUID REFERENCES auth.users(id),
  verified BOOLEAN DEFAULT false,
  anonymous BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create employee_network table for referral connections
CREATE TABLE IF NOT EXISTS public.employee_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT,
  department TEXT,
  years_at_company DECIMAL,
  can_provide_referral BOOLEAN DEFAULT false,
  willing_to_chat BOOLEAN DEFAULT true,
  linkedin_url TEXT,
  bio TEXT,
  specialties TEXT[],
  contact_preference TEXT, -- linkedin, email, platform
  availability_status TEXT DEFAULT 'open', -- open, busy, unavailable
  response_rate INTEGER DEFAULT 0, -- percentage
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create connection_requests table for referral networking
CREATE TABLE IF NOT EXISTS public.connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  employee_network_id UUID NOT NULL REFERENCES public.employee_network(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, completed
  response_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

-- Create company_status_tracker table for layoffs/hiring freezes
CREATE TABLE IF NOT EXISTS public.company_status_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  status_type TEXT NOT NULL, -- layoff, hiring_freeze, mass_hiring, restructuring
  severity TEXT, -- low, medium, high
  affected_departments TEXT[],
  employee_count_impact INTEGER,
  start_date DATE NOT NULL,
  end_date DATE,
  source_url TEXT,
  description TEXT,
  verified BOOLEAN DEFAULT false,
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create helpful votes tables
CREATE TABLE IF NOT EXISTS public.company_insight_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID NOT NULL REFERENCES public.company_insights(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(insight_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.company_review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.company_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Create indexes
CREATE INDEX idx_company_insights_company ON public.company_insights(company_name);
CREATE INDEX idx_company_insights_type ON public.company_insights(insight_type);
CREATE INDEX idx_company_reviews_company ON public.company_reviews(company_name);
CREATE INDEX idx_employee_network_company ON public.employee_network(company_name);
CREATE INDEX idx_employee_network_profile ON public.employee_network(profile_id);
CREATE INDEX idx_connection_requests_requester ON public.connection_requests(requester_profile_id);
CREATE INDEX idx_connection_requests_employee ON public.connection_requests(employee_network_id);
CREATE INDEX idx_company_status_company ON public.company_status_tracker(company_name);
CREATE INDEX idx_company_status_type ON public.company_status_tracker(status_type);

-- Enable RLS
ALTER TABLE public.company_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_network ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_status_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_insight_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_review_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_insights
CREATE POLICY "Anyone can view verified company insights"
  ON public.company_insights FOR SELECT
  USING (verified = true OR submitted_by = auth.uid());

CREATE POLICY "Authenticated users can submit insights"
  ON public.company_insights FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update their own insights"
  ON public.company_insights FOR UPDATE
  USING (auth.uid() = submitted_by);

-- RLS Policies for company_reviews
CREATE POLICY "Anyone can view company reviews"
  ON public.company_reviews FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can submit reviews"
  ON public.company_reviews FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update their own reviews"
  ON public.company_reviews FOR UPDATE
  USING (auth.uid() = submitted_by);

-- RLS Policies for employee_network
CREATE POLICY "Anyone can view employee network"
  ON public.employee_network FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own network profile"
  ON public.employee_network FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own network profile"
  ON public.employee_network FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for connection_requests
CREATE POLICY "Users can view their connection requests"
  ON public.connection_requests FOR SELECT
  USING (
    requester_profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    ) OR
    employee_network_id IN (
      SELECT en.id FROM public.employee_network en
      JOIN public.candidate_profiles cp ON en.profile_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create connection requests"
  ON public.connection_requests FOR INSERT
  WITH CHECK (
    requester_profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their connection requests"
  ON public.connection_requests FOR UPDATE
  USING (
    requester_profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    ) OR
    employee_network_id IN (
      SELECT en.id FROM public.employee_network en
      JOIN public.candidate_profiles cp ON en.profile_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

-- RLS Policies for company_status_tracker
CREATE POLICY "Anyone can view company status"
  ON public.company_status_tracker FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can submit status updates"
  ON public.company_status_tracker FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

-- RLS Policies for votes
CREATE POLICY "Users can manage their votes on insights"
  ON public.company_insight_votes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their votes on reviews"
  ON public.company_review_votes FOR ALL
  USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_company_insights_updated_at
  BEFORE UPDATE ON public.company_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_reviews_updated_at
  BEFORE UPDATE ON public.company_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_network_updated_at
  BEFORE UPDATE ON public.employee_network
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_connection_requests_updated_at
  BEFORE UPDATE ON public.connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_status_updated_at
  BEFORE UPDATE ON public.company_status_tracker
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();