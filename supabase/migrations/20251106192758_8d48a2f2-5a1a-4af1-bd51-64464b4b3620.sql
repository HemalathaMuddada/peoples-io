-- Create follow_up_suggestions table
CREATE TABLE IF NOT EXISTS public.follow_up_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  suggested_date TIMESTAMPTZ NOT NULL,
  follow_up_type TEXT NOT NULL, -- post_application, post_interview, post_rejection, check_in
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, dismissed, snoozed
  snoozed_until TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create follow_up_emails table
CREATE TABLE IF NOT EXISTS public.follow_up_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  suggestion_id UUID REFERENCES public.follow_up_suggestions(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  tone TEXT, -- professional, friendly, enthusiastic, formal
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_follow_up_suggestions_application_id ON public.follow_up_suggestions(application_id);
CREATE INDEX idx_follow_up_suggestions_status ON public.follow_up_suggestions(status);
CREATE INDEX idx_follow_up_suggestions_suggested_date ON public.follow_up_suggestions(suggested_date);
CREATE INDEX idx_follow_up_emails_application_id ON public.follow_up_emails(application_id);
CREATE INDEX idx_follow_up_emails_suggestion_id ON public.follow_up_emails(suggestion_id);

-- Enable RLS
ALTER TABLE public.follow_up_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for follow_up_suggestions
CREATE POLICY "Users can view their own follow-up suggestions"
  ON public.follow_up_suggestions
  FOR SELECT
  USING (
    application_id IN (
      SELECT ja.id FROM public.job_applications ja
      JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own follow-up suggestions"
  ON public.follow_up_suggestions
  FOR INSERT
  WITH CHECK (
    application_id IN (
      SELECT ja.id FROM public.job_applications ja
      JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own follow-up suggestions"
  ON public.follow_up_suggestions
  FOR UPDATE
  USING (
    application_id IN (
      SELECT ja.id FROM public.job_applications ja
      JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own follow-up suggestions"
  ON public.follow_up_suggestions
  FOR DELETE
  USING (
    application_id IN (
      SELECT ja.id FROM public.job_applications ja
      JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

-- RLS Policies for follow_up_emails
CREATE POLICY "Users can view their own follow-up emails"
  ON public.follow_up_emails
  FOR SELECT
  USING (
    application_id IN (
      SELECT ja.id FROM public.job_applications ja
      JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own follow-up emails"
  ON public.follow_up_emails
  FOR INSERT
  WITH CHECK (
    application_id IN (
      SELECT ja.id FROM public.job_applications ja
      JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own follow-up emails"
  ON public.follow_up_emails
  FOR UPDATE
  USING (
    application_id IN (
      SELECT ja.id FROM public.job_applications ja
      JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own follow-up emails"
  ON public.follow_up_emails
  FOR DELETE
  USING (
    application_id IN (
      SELECT ja.id FROM public.job_applications ja
      JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_follow_up_suggestions_updated_at
  BEFORE UPDATE ON public.follow_up_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_follow_up_emails_updated_at
  BEFORE UPDATE ON public.follow_up_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();