-- Create email_signatures table
CREATE TABLE IF NOT EXISTS public.email_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Name of the signature (e.g., "Default", "Professional")
  full_name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  logo_url TEXT,
  social_links JSONB DEFAULT '{}'::jsonb, -- {linkedin: "", twitter: "", etc}
  disclaimer TEXT,
  custom_html TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for user's signatures
CREATE INDEX idx_email_signatures_user_id ON public.email_signatures(user_id);

-- Create index for default signature lookup
CREATE INDEX idx_email_signatures_default ON public.email_signatures(user_id, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.email_signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own signatures"
ON public.email_signatures FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own signatures"
ON public.email_signatures FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own signatures"
ON public.email_signatures FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own signatures"
ON public.email_signatures FOR DELETE
USING (auth.uid() = user_id);

-- Function to ensure only one default signature per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_signature()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this signature as default, unset all other defaults for this user
  IF NEW.is_default = true THEN
    UPDATE public.email_signatures
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to maintain single default
CREATE TRIGGER ensure_single_default_signature_trigger
BEFORE INSERT OR UPDATE ON public.email_signatures
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_signature();

-- Function to update updated_at
CREATE TRIGGER update_email_signatures_updated_at
BEFORE UPDATE ON public.email_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_signatures TO authenticated;