-- Create message templates table
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('interview_invite', 'rejection', 'offer', 'follow_up', 'screening', 'general')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create candidate communications table
CREATE TABLE IF NOT EXISTS public.candidate_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.job_applications(id) ON DELETE CASCADE,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_templates
CREATE POLICY "Recruiters can view templates" ON public.message_templates
  FOR SELECT USING (
    has_role(auth.uid(), 'recruiter'::app_role) OR
    has_role(auth.uid(), 'agency_admin'::app_role) OR
    has_role(auth.uid(), 'hiring_manager'::app_role) OR
    has_role(auth.uid(), 'platform_admin'::app_role)
  );

CREATE POLICY "Recruiters can create templates" ON public.message_templates
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'recruiter'::app_role) OR
    has_role(auth.uid(), 'agency_admin'::app_role) OR
    has_role(auth.uid(), 'hiring_manager'::app_role) OR
    has_role(auth.uid(), 'platform_admin'::app_role)
  );

CREATE POLICY "Recruiters can update their templates" ON public.message_templates
  FOR UPDATE USING (
    created_by = auth.uid() OR
    has_role(auth.uid(), 'agency_admin'::app_role) OR
    has_role(auth.uid(), 'platform_admin'::app_role)
  );

CREATE POLICY "Recruiters can delete their templates" ON public.message_templates
  FOR DELETE USING (
    created_by = auth.uid() OR
    has_role(auth.uid(), 'agency_admin'::app_role) OR
    has_role(auth.uid(), 'platform_admin'::app_role)
  );

-- RLS Policies for candidate_communications
CREATE POLICY "Recruiters can view communications" ON public.candidate_communications
  FOR SELECT USING (
    has_role(auth.uid(), 'recruiter'::app_role) OR
    has_role(auth.uid(), 'agency_admin'::app_role) OR
    has_role(auth.uid(), 'hiring_manager'::app_role) OR
    has_role(auth.uid(), 'platform_admin'::app_role)
  );

CREATE POLICY "Recruiters can create communications" ON public.candidate_communications
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'recruiter'::app_role) OR
    has_role(auth.uid(), 'agency_admin'::app_role) OR
    has_role(auth.uid(), 'hiring_manager'::app_role) OR
    has_role(auth.uid(), 'platform_admin'::app_role)
  );

-- Create indexes
CREATE INDEX idx_message_templates_created_by ON public.message_templates(created_by);
CREATE INDEX idx_message_templates_category ON public.message_templates(category);
CREATE INDEX idx_candidate_communications_application ON public.candidate_communications(application_id);
CREATE INDEX idx_candidate_communications_sent_by ON public.candidate_communications(sent_by);

-- Create updated_at trigger for message_templates
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default templates
INSERT INTO public.message_templates (name, subject, category, body) VALUES
('Interview Invitation', 'Interview Invitation for {{job_title}}', 'interview_invite', 
'Hi {{candidate_name}},

We were impressed with your application for the {{job_title}} position and would like to invite you for an interview.

Interview Details:
Date: {{interview_date}}
Time: {{interview_time}}
Location/Link: {{interview_location}}

Please confirm your availability by replying to this email.

Best regards,
{{recruiter_name}}'),

('Application Rejection', 'Update on Your Application', 'rejection',
'Hi {{candidate_name}},

Thank you for your interest in the {{job_title}} position at {{company_name}}.

After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.

We appreciate the time you took to apply and wish you the best in your job search.

Best regards,
{{recruiter_name}}'),

('Job Offer', 'Job Offer - {{job_title}}', 'offer',
'Hi {{candidate_name}},

Congratulations! We are pleased to offer you the position of {{job_title}} at {{company_name}}.

Offer Details:
- Start Date: {{start_date}}
- Salary: {{salary}}
- Benefits: {{benefits}}

Please review the attached offer letter and let us know your decision by {{decision_deadline}}.

We look forward to having you on our team!

Best regards,
{{recruiter_name}}'),

('Follow-Up', 'Following Up on Your Application', 'follow_up',
'Hi {{candidate_name}},

I wanted to follow up on your application for the {{job_title}} position.

{{custom_message}}

Please feel free to reach out if you have any questions.

Best regards,
{{recruiter_name}}');
