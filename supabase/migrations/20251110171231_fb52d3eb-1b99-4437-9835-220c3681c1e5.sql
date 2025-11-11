-- Create interviews table first
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  interview_type TEXT NOT NULL CHECK (interview_type IN ('phone_screen', 'technical', 'behavioral', 'panel', 'final', 'other')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  meeting_link TEXT,
  interviewer_name TEXT,
  interviewer_email TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Recruiters can manage interviews for their org
CREATE POLICY "Recruiters can view interviews for their org"
  ON public.interviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.job_postings jp ON ja.job_posting_id = jp.id
      JOIN public.user_roles ur ON ur.org_id = jp.org_id
      WHERE ja.id = interviews.application_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('recruiter', 'hiring_manager', 'org_admin', 'agency_admin')
    )
  );

CREATE POLICY "Recruiters can create interviews for their org"
  ON public.interviews
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.job_postings jp ON ja.job_posting_id = jp.id
      JOIN public.user_roles ur ON ur.org_id = jp.org_id
      WHERE ja.id = interviews.application_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('recruiter', 'hiring_manager', 'org_admin', 'agency_admin')
    )
  );

CREATE POLICY "Recruiters can update interviews for their org"
  ON public.interviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.job_postings jp ON ja.job_posting_id = jp.id
      JOIN public.user_roles ur ON ur.org_id = jp.org_id
      WHERE ja.id = interviews.application_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('recruiter', 'hiring_manager', 'org_admin', 'agency_admin')
    )
  );

-- Candidates can view interviews for their applications
CREATE POLICY "Candidates can view their interviews"
  ON public.interviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
      WHERE ja.id = interviews.application_id
        AND cp.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_interviews_updated_at
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create interview_feedback table
CREATE TABLE IF NOT EXISTS public.interview_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL,
  rating_technical INTEGER CHECK (rating_technical >= 1 AND rating_technical <= 5),
  rating_communication INTEGER CHECK (rating_communication >= 1 AND rating_communication <= 5),
  rating_culture_fit INTEGER CHECK (rating_culture_fit >= 1 AND rating_culture_fit <= 5),
  rating_problem_solving INTEGER CHECK (rating_problem_solving >= 1 AND rating_problem_solving <= 5),
  rating_overall INTEGER NOT NULL CHECK (rating_overall >= 1 AND rating_overall <= 5),
  strengths TEXT,
  areas_for_improvement TEXT,
  additional_notes TEXT,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('strong_hire', 'hire', 'maybe', 'no_hire')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_feedback ENABLE ROW LEVEL SECURITY;

-- Recruiters can view feedback for interviews in their org
CREATE POLICY "Recruiters can view feedback for their org interviews"
  ON public.interview_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.job_applications ja ON i.application_id = ja.id
      JOIN public.job_postings jp ON ja.job_posting_id = jp.id
      JOIN public.user_roles ur ON ur.org_id = jp.org_id
      WHERE i.id = interview_feedback.interview_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('recruiter', 'hiring_manager', 'org_admin', 'agency_admin')
    )
  );

-- Recruiters can submit feedback for interviews in their org
CREATE POLICY "Recruiters can submit feedback for their org interviews"
  ON public.interview_feedback
  FOR INSERT
  WITH CHECK (
    auth.uid() = submitted_by AND
    EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.job_applications ja ON i.application_id = ja.id
      JOIN public.job_postings jp ON ja.job_posting_id = jp.id
      JOIN public.user_roles ur ON ur.org_id = jp.org_id
      WHERE i.id = interview_feedback.interview_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('recruiter', 'hiring_manager', 'org_admin', 'agency_admin')
    )
  );

-- Recruiters can update their own feedback
CREATE POLICY "Recruiters can update their own feedback"
  ON public.interview_feedback
  FOR UPDATE
  USING (auth.uid() = submitted_by);

-- Platform admins can manage all feedback
CREATE POLICY "Platform admins can manage all feedback"
  ON public.interview_feedback
  FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (has_role(auth.uid(), 'platform_admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_interview_feedback_updated_at
  BEFORE UPDATE ON public.interview_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster queries
CREATE INDEX idx_interviews_application_id ON public.interviews(application_id);
CREATE INDEX idx_interviews_scheduled_at ON public.interviews(scheduled_at);
CREATE INDEX idx_interview_feedback_interview_id ON public.interview_feedback(interview_id);
CREATE INDEX idx_interview_feedback_submitted_by ON public.interview_feedback(submitted_by);