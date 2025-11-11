-- Create mentor reviews/ratings table
CREATE TABLE IF NOT EXISTS public.mentor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.mentorship_sessions(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(mentee_id, session_id)
);

-- Create mentor availability slots
CREATE TABLE IF NOT EXISTS public.mentor_availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_recurring BOOLEAN DEFAULT true,
  specific_date DATE,
  is_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create mentor resources library
CREATE TABLE IF NOT EXISTS public.mentor_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('article', 'template', 'guide', 'video', 'tool')),
  content_url TEXT,
  file_path TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create mentor badges/achievements
CREATE TABLE IF NOT EXISTS public.mentor_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(mentor_id, badge_type)
);

-- Create mentor articles/content
CREATE TABLE IF NOT EXISTS public.mentor_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create mentorship progress tracking
CREATE TABLE IF NOT EXISTS public.mentorship_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorship_request_id UUID NOT NULL REFERENCES public.mentorship_requests(id) ON DELETE CASCADE,
  milestone_title TEXT NOT NULL,
  milestone_description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  target_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create session notes
CREATE TABLE IF NOT EXISTS public.session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.mentorship_sessions(id) ON DELETE CASCADE,
  notes TEXT NOT NULL,
  action_items JSONB DEFAULT '[]',
  key_topics TEXT[] DEFAULT '{}',
  next_steps TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create mentorship certificates
CREATE TABLE IF NOT EXISTS public.mentorship_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentorship_request_id UUID NOT NULL REFERENCES public.mentorship_requests(id) ON DELETE CASCADE,
  program_name TEXT NOT NULL,
  description TEXT,
  skills_acquired TEXT[] DEFAULT '{}',
  total_sessions INTEGER DEFAULT 0,
  total_hours NUMERIC DEFAULT 0,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  certificate_url TEXT,
  verification_code TEXT UNIQUE,
  is_verified BOOLEAN DEFAULT true
);

-- Create mentor job referrals
CREATE TABLE IF NOT EXISTS public.mentor_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_posting_id UUID REFERENCES public.job_postings(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  referral_status TEXT DEFAULT 'pending' CHECK (referral_status IN ('pending', 'submitted', 'interview', 'offered', 'hired', 'rejected')),
  referral_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create skill assessments for gap analysis
CREATE TABLE IF NOT EXISTS public.skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  skill_name TEXT NOT NULL,
  current_level INTEGER CHECK (current_level >= 1 AND current_level <= 10),
  target_level INTEGER CHECK (target_level >= 1 AND target_level <= 10),
  assessment_notes TEXT,
  improvement_plan TEXT,
  resources_recommended JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  next_review_date DATE
);

-- Create mentor network connections
CREATE TABLE IF NOT EXISTS public.mentor_network_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_name TEXT NOT NULL,
  connection_title TEXT,
  connection_company TEXT,
  connection_email TEXT,
  connection_linkedin TEXT,
  introduction_status TEXT DEFAULT 'pending' CHECK (introduction_status IN ('pending', 'introduced', 'connected', 'declined')),
  introduction_notes TEXT,
  introduced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create mentor analytics summary (materialized for performance)
CREATE TABLE IF NOT EXISTS public.mentor_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_sessions INTEGER DEFAULT 0,
  total_mentees INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_hours NUMERIC DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  articles_published INTEGER DEFAULT 0,
  resources_shared INTEGER DEFAULT 0,
  badges_earned INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(mentor_id)
);

-- Enable RLS on all tables
ALTER TABLE public.mentor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_network_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mentor_reviews
CREATE POLICY "Users can view reviews for mentors"
  ON public.mentor_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Mentees can create reviews after sessions"
  ON public.mentor_reviews FOR INSERT
  TO authenticated
  WITH CHECK (mentee_id = auth.uid());

CREATE POLICY "Mentees can update their own reviews"
  ON public.mentor_reviews FOR UPDATE
  TO authenticated
  USING (mentee_id = auth.uid());

-- RLS Policies for mentor_availability_slots
CREATE POLICY "Anyone can view mentor availability"
  ON public.mentor_availability_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Mentors can manage their availability"
  ON public.mentor_availability_slots FOR ALL
  TO authenticated
  USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

-- RLS Policies for mentor_resources
CREATE POLICY "Anyone can view public resources"
  ON public.mentor_resources FOR SELECT
  TO authenticated
  USING (is_public = true OR mentor_id = auth.uid());

CREATE POLICY "Mentors can manage their resources"
  ON public.mentor_resources FOR ALL
  TO authenticated
  USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

-- RLS Policies for mentor_badges
CREATE POLICY "Anyone can view mentor badges"
  ON public.mentor_badges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage badges"
  ON public.mentor_badges FOR ALL
  TO authenticated
  USING (mentor_id = auth.uid());

-- RLS Policies for mentor_articles
CREATE POLICY "Anyone can view published articles"
  ON public.mentor_articles FOR SELECT
  TO authenticated
  USING (published = true OR mentor_id = auth.uid());

CREATE POLICY "Mentors can manage their articles"
  ON public.mentor_articles FOR ALL
  TO authenticated
  USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

-- RLS Policies for mentorship_progress
CREATE POLICY "Participants can view mentorship progress"
  ON public.mentorship_progress FOR SELECT
  TO authenticated
  USING (
    mentorship_request_id IN (
      SELECT id FROM public.mentorship_requests
      WHERE mentee_id = auth.uid() OR mentor_id = auth.uid()
    )
  );

CREATE POLICY "Participants can manage progress"
  ON public.mentorship_progress FOR ALL
  TO authenticated
  USING (
    mentorship_request_id IN (
      SELECT id FROM public.mentorship_requests
      WHERE mentee_id = auth.uid() OR mentor_id = auth.uid()
    )
  )
  WITH CHECK (
    mentorship_request_id IN (
      SELECT id FROM public.mentorship_requests
      WHERE mentee_id = auth.uid() OR mentor_id = auth.uid()
    )
  );

-- RLS Policies for session_notes
CREATE POLICY "Session participants can view notes"
  ON public.session_notes FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT ms.id FROM public.mentorship_sessions ms
      JOIN public.mentorship_requests mr ON ms.mentorship_request_id = mr.id
      WHERE mr.mentee_id = auth.uid() OR mr.mentor_id = auth.uid()
    )
  );

CREATE POLICY "Session participants can create notes"
  ON public.session_notes FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- RLS Policies for mentorship_certificates
CREATE POLICY "Users can view their own certificates"
  ON public.mentorship_certificates FOR SELECT
  TO authenticated
  USING (mentee_id = auth.uid() OR mentor_id = auth.uid());

CREATE POLICY "Mentors can issue certificates"
  ON public.mentorship_certificates FOR INSERT
  TO authenticated
  WITH CHECK (mentor_id = auth.uid());

-- RLS Policies for mentor_referrals
CREATE POLICY "Participants can view referrals"
  ON public.mentor_referrals FOR SELECT
  TO authenticated
  USING (mentor_id = auth.uid() OR mentee_id = auth.uid());

CREATE POLICY "Mentors can create referrals"
  ON public.mentor_referrals FOR INSERT
  TO authenticated
  WITH CHECK (mentor_id = auth.uid());

CREATE POLICY "Participants can update referrals"
  ON public.mentor_referrals FOR UPDATE
  TO authenticated
  USING (mentor_id = auth.uid() OR mentee_id = auth.uid());

-- RLS Policies for skill_assessments
CREATE POLICY "Users can view their assessments"
  ON public.skill_assessments FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.candidate_profiles
      WHERE user_id = auth.uid()
    ) OR mentor_id = auth.uid()
  );

CREATE POLICY "Mentors can create assessments"
  ON public.skill_assessments FOR INSERT
  TO authenticated
  WITH CHECK (mentor_id = auth.uid());

CREATE POLICY "Mentors can update assessments"
  ON public.skill_assessments FOR UPDATE
  TO authenticated
  USING (mentor_id = auth.uid());

-- RLS Policies for mentor_network_connections
CREATE POLICY "Participants can view network connections"
  ON public.mentor_network_connections FOR SELECT
  TO authenticated
  USING (mentor_id = auth.uid() OR mentee_id = auth.uid());

CREATE POLICY "Mentors can manage network connections"
  ON public.mentor_network_connections FOR ALL
  TO authenticated
  USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

-- RLS Policies for mentor_analytics
CREATE POLICY "Anyone can view mentor analytics"
  ON public.mentor_analytics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can update analytics"
  ON public.mentor_analytics FOR ALL
  TO authenticated
  USING (mentor_id = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER update_mentor_reviews_updated_at
  BEFORE UPDATE ON public.mentor_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentor_availability_slots_updated_at
  BEFORE UPDATE ON public.mentor_availability_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentor_resources_updated_at
  BEFORE UPDATE ON public.mentor_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentor_articles_updated_at
  BEFORE UPDATE ON public.mentor_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentorship_progress_updated_at
  BEFORE UPDATE ON public.mentorship_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_notes_updated_at
  BEFORE UPDATE ON public.session_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentor_referrals_updated_at
  BEFORE UPDATE ON public.mentor_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skill_assessments_updated_at
  BEFORE UPDATE ON public.skill_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_mentor_reviews_mentor_id ON public.mentor_reviews(mentor_id);
CREATE INDEX idx_mentor_reviews_rating ON public.mentor_reviews(rating);
CREATE INDEX idx_mentor_availability_mentor_id ON public.mentor_availability_slots(mentor_id);
CREATE INDEX idx_mentor_resources_mentor_id ON public.mentor_resources(mentor_id);
CREATE INDEX idx_mentor_resources_tags ON public.mentor_resources USING GIN(tags);
CREATE INDEX idx_mentor_articles_mentor_id ON public.mentor_articles(mentor_id);
CREATE INDEX idx_mentor_articles_published ON public.mentor_articles(published);
CREATE INDEX idx_mentorship_progress_request_id ON public.mentorship_progress(mentorship_request_id);
CREATE INDEX idx_session_notes_session_id ON public.session_notes(session_id);
CREATE INDEX idx_mentor_referrals_mentor_id ON public.mentor_referrals(mentor_id);
CREATE INDEX idx_mentor_referrals_mentee_id ON public.mentor_referrals(mentee_id);
CREATE INDEX idx_skill_assessments_profile_id ON public.skill_assessments(profile_id);
CREATE INDEX idx_mentor_network_mentor_id ON public.mentor_network_connections(mentor_id);