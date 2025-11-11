-- Create interview_schedules table
CREATE TABLE IF NOT EXISTS public.interview_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.job_applications(id) ON DELETE CASCADE,
  interview_type TEXT NOT NULL, -- phone_screen, technical, behavioral, onsite, final
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  location TEXT, -- physical address or video link
  interviewer_name TEXT,
  interviewer_email TEXT,
  notes TEXT,
  preparation_checklist JSONB DEFAULT '[]'::jsonb,
  reminder_sent BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled, rescheduled
  completed_at TIMESTAMPTZ,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_interview_schedules_profile_id ON public.interview_schedules(profile_id);
CREATE INDEX idx_interview_schedules_scheduled_at ON public.interview_schedules(scheduled_at);
CREATE INDEX idx_interview_schedules_status ON public.interview_schedules(status);

-- Enable RLS
ALTER TABLE public.interview_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own interview schedules"
  ON public.interview_schedules
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own interview schedules"
  ON public.interview_schedules
  FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own interview schedules"
  ON public.interview_schedules
  FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own interview schedules"
  ON public.interview_schedules
  FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_interview_schedules_updated_at
  BEFORE UPDATE ON public.interview_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for LinkedIn profile optimization suggestions
CREATE TABLE IF NOT EXISTS public.linkedin_optimization_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  suggestions JSONB NOT NULL,
  overall_score INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index
CREATE INDEX idx_linkedin_suggestions_profile_id ON public.linkedin_optimization_suggestions(profile_id);

-- Enable RLS
ALTER TABLE public.linkedin_optimization_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own LinkedIn suggestions"
  ON public.linkedin_optimization_suggestions
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own LinkedIn suggestions"
  ON public.linkedin_optimization_suggestions
  FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
  );