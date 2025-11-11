-- Add new stages to application_status enum for complete pipeline
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'new';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'screening';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'phone_screen';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'technical_interview';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'final_interview';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'hired';

-- Create pipeline_stage_history table to track stage changes
CREATE TABLE IF NOT EXISTS public.pipeline_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  from_stage application_status,
  to_stage application_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  duration_in_stage INTERVAL
);

-- Enable RLS for pipeline_stage_history
ALTER TABLE public.pipeline_stage_history ENABLE ROW LEVEL SECURITY;

-- Policy: Recruiters and admins can view all stage history
CREATE POLICY "Recruiters can view all pipeline stage history"
  ON public.pipeline_stage_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('recruiter', 'agency_admin', 'hiring_manager')
    )
  );

-- Policy: Recruiters can insert stage history
CREATE POLICY "Recruiters can create pipeline stage history"
  ON public.pipeline_stage_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('recruiter', 'agency_admin', 'hiring_manager')
    )
  );

-- Create function to automatically log stage changes
CREATE OR REPLACE FUNCTION log_application_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.pipeline_stage_history (
      application_id,
      from_stage,
      to_stage,
      changed_by,
      duration_in_stage
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      CASE 
        WHEN OLD.updated_at IS NOT NULL 
        THEN NEW.updated_at - OLD.updated_at
        ELSE NULL
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to log stage changes automatically
DROP TRIGGER IF EXISTS application_stage_change_trigger ON public.job_applications;
CREATE TRIGGER application_stage_change_trigger
  AFTER UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION log_application_stage_change();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_history_application_id 
  ON public.pipeline_stage_history(application_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_history_changed_at 
  ON public.pipeline_stage_history(changed_at DESC);