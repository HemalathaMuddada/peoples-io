-- Create table for custom email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, template_type)
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Org admins can manage their templates
CREATE POLICY "Org admins can manage email templates"
ON public.email_templates
FOR ALL
USING (
  org_id IN (
    SELECT ur.org_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('org_admin', 'platform_admin', 'agency_admin')
  )
)
WITH CHECK (
  org_id IN (
    SELECT ur.org_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('org_admin', 'platform_admin', 'agency_admin')
  )
);

-- Create index for faster queries
CREATE INDEX idx_email_templates_org_id ON public.email_templates(org_id);
CREATE INDEX idx_email_templates_type ON public.email_templates(template_type);

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();