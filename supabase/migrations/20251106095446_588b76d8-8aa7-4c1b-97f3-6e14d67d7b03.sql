-- Salary Negotiation Sessions
CREATE TABLE public.negotiation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  company TEXT,
  current_offer INTEGER,
  target_salary INTEGER,
  conversation_history JSONB DEFAULT '[]'::jsonb,
  final_result TEXT,
  outcome TEXT CHECK (outcome IN ('success', 'failed', 'in_progress')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Company Culture Data
CREATE TABLE public.company_culture_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL UNIQUE,
  culture_scores JSONB,
  review_summary TEXT,
  total_reviews INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Interview Question Bank
CREATE TABLE public.interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT,
  job_role TEXT NOT NULL,
  question TEXT NOT NULL,
  category TEXT CHECK (category IN ('technical', 'behavioral', 'cultural', 'situational')),
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  upvotes INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crowd-sourced Answers
CREATE TABLE public.interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.interview_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  upvotes INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Application Metrics for A/B Testing
CREATE TABLE public.application_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  resume_version_id UUID REFERENCES public.resume_versions(id) ON DELETE SET NULL,
  views INTEGER DEFAULT 0,
  response_received BOOLEAN DEFAULT false,
  interview_granted BOOLEAN DEFAULT false,
  time_to_response_hours INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.negotiation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_culture_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for negotiation_sessions
CREATE POLICY "Users can view their own negotiation sessions"
  ON public.negotiation_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own negotiation sessions"
  ON public.negotiation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own negotiation sessions"
  ON public.negotiation_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for company_culture_data
CREATE POLICY "Anyone can view company culture data"
  ON public.company_culture_data FOR SELECT
  USING (true);

-- RLS Policies for interview_questions
CREATE POLICY "Anyone can view interview questions"
  ON public.interview_questions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can submit questions"
  ON public.interview_questions FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update their own questions"
  ON public.interview_questions FOR UPDATE
  USING (auth.uid() = submitted_by);

-- RLS Policies for interview_answers
CREATE POLICY "Anyone can view answers"
  ON public.interview_answers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can submit answers"
  ON public.interview_answers FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update their own answers"
  ON public.interview_answers FOR UPDATE
  USING (auth.uid() = submitted_by);

-- RLS Policies for application_metrics
CREATE POLICY "Users can view metrics for their applications"
  ON public.application_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
      WHERE ja.id = application_metrics.application_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create metrics for their applications"
  ON public.application_metrics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
      WHERE ja.id = application_metrics.application_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update metrics for their applications"
  ON public.application_metrics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
      WHERE ja.id = application_metrics.application_id
      AND cp.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_negotiation_sessions_user ON public.negotiation_sessions(user_id);
CREATE INDEX idx_company_culture_company ON public.company_culture_data(company_name);
CREATE INDEX idx_interview_questions_role ON public.interview_questions(job_role);
CREATE INDEX idx_interview_questions_company ON public.interview_questions(company);
CREATE INDEX idx_interview_answers_question ON public.interview_answers(question_id);
CREATE INDEX idx_application_metrics_application ON public.application_metrics(application_id);
CREATE INDEX idx_application_metrics_version ON public.application_metrics(resume_version_id);

-- Triggers for updated_at
CREATE TRIGGER update_negotiation_sessions_updated_at
  BEFORE UPDATE ON public.negotiation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_questions_updated_at
  BEFORE UPDATE ON public.interview_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_answers_updated_at
  BEFORE UPDATE ON public.interview_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_application_metrics_updated_at
  BEFORE UPDATE ON public.application_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();