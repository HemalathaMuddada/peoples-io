-- Create scheduled_emails table
CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipients JSONB NOT NULL, -- Array of {id, email, name, personalized_subject, personalized_body}
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  total_count INTEGER NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient querying of pending scheduled emails
CREATE INDEX idx_scheduled_emails_status_scheduled_for 
ON public.scheduled_emails(status, scheduled_for) 
WHERE status = 'pending';

-- Create index for user's scheduled emails
CREATE INDEX idx_scheduled_emails_created_by 
ON public.scheduled_emails(created_by, created_at DESC);

-- Enable RLS
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own scheduled emails"
ON public.scheduled_emails FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own scheduled emails"
ON public.scheduled_emails FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own scheduled emails"
ON public.scheduled_emails FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own scheduled emails"
ON public.scheduled_emails FOR DELETE
USING (auth.uid() = created_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_scheduled_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updated_at
CREATE TRIGGER update_scheduled_emails_updated_at
BEFORE UPDATE ON public.scheduled_emails
FOR EACH ROW
EXECUTE FUNCTION public.update_scheduled_emails_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_emails TO authenticated;