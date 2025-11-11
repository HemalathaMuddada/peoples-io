-- Create table for application reminders and follow-ups
CREATE TABLE IF NOT EXISTS public.application_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- 'follow_up', 'interview_prep', 'status_check'
  reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for application analytics/events
CREATE TABLE IF NOT EXISTS public.application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'applied', 'viewed', 'interview_scheduled', 'response_received'
  event_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for generated documents (cover letters, etc)
CREATE TABLE IF NOT EXISTS public.application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'cover_letter', 'thank_you', 'follow_up'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for interview preparation
CREATE TABLE IF NOT EXISTS public.interview_prep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  questions JSONB, -- AI-generated interview questions
  company_research JSONB, -- Compiled company info
  preparation_notes TEXT,
  interview_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for job search filters/saved searches
CREATE TABLE IF NOT EXISTS public.saved_job_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  notify_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for company watchlist
CREATE TABLE IF NOT EXISTS public.company_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  notes TEXT,
  notify_on_posting BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.application_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_prep ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_job_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_watchlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for application_reminders
CREATE POLICY "Users can manage their reminders"
ON public.application_reminders
FOR ALL
USING (
  application_id IN (
    SELECT ja.id FROM public.job_applications ja
    JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);

-- RLS Policies for application_events
CREATE POLICY "Users can manage their application events"
ON public.application_events
FOR ALL
USING (
  application_id IN (
    SELECT ja.id FROM public.job_applications ja
    JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);

-- RLS Policies for application_documents
CREATE POLICY "Users can manage their documents"
ON public.application_documents
FOR ALL
USING (
  application_id IN (
    SELECT ja.id FROM public.job_applications ja
    JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);

-- RLS Policies for interview_prep
CREATE POLICY "Users can manage their interview prep"
ON public.interview_prep
FOR ALL
USING (
  application_id IN (
    SELECT ja.id FROM public.job_applications ja
    JOIN public.candidate_profiles cp ON ja.profile_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);

-- RLS Policies for saved_job_searches
CREATE POLICY "Users can manage their saved searches"
ON public.saved_job_searches
FOR ALL
USING (
  profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  )
);

-- RLS Policies for company_watchlist
CREATE POLICY "Users can manage their company watchlist"
ON public.company_watchlist
FOR ALL
USING (
  profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_reminders_date ON public.application_reminders(reminder_date) WHERE NOT completed;
CREATE INDEX idx_events_application ON public.application_events(application_id);
CREATE INDEX idx_documents_application ON public.application_documents(application_id);
CREATE INDEX idx_interview_prep_application ON public.interview_prep(application_id);