-- Create job alerts table
CREATE TABLE IF NOT EXISTS public.job_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  alert_name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('instant', 'daily', 'weekly')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create candidate availability table
CREATE TABLE IF NOT EXISTS public.candidate_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  specific_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_alerts
CREATE POLICY "Users can manage their own job alerts"
  ON public.job_alerts
  FOR ALL
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

-- RLS Policies for candidate_availability
CREATE POLICY "Users can manage their own availability"
  ON public.candidate_availability
  FOR ALL
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_job_alerts_profile_id ON public.job_alerts(profile_id);
CREATE INDEX idx_job_alerts_enabled ON public.job_alerts(enabled) WHERE enabled = true;
CREATE INDEX idx_candidate_availability_profile_id ON public.candidate_availability(profile_id);
CREATE INDEX idx_candidate_availability_day ON public.candidate_availability(day_of_week);
CREATE INDEX idx_application_reminders_date ON public.application_reminders(reminder_date) WHERE completed = false;

-- Add trigger for updated_at
CREATE TRIGGER update_job_alerts_updated_at
  BEFORE UPDATE ON public.job_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidate_availability_updated_at
  BEFORE UPDATE ON public.candidate_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();