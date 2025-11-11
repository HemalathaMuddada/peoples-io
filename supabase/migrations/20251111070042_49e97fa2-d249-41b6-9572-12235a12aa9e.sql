-- Fix function search path for security by properly dropping trigger first
DROP TRIGGER IF EXISTS application_stage_change_trigger ON public.job_applications;
DROP FUNCTION IF EXISTS log_application_stage_change();

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Recreate trigger
CREATE TRIGGER application_stage_change_trigger
  AFTER UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION log_application_stage_change();