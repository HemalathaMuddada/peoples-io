-- Add soft delete column to job_applications
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for non-deleted applications
CREATE INDEX IF NOT EXISTS idx_job_applications_not_deleted 
ON job_applications(profile_id, deleted_at) 
WHERE deleted_at IS NULL;

-- Create audit trigger function for job_applications
CREATE OR REPLACE FUNCTION audit_job_application_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      user_id,
      org_id,
      action,
      target_type,
      target_id,
      meta_json
    )
    SELECT 
      cp.user_id,
      cp.org_id,
      'delete_job_application',
      'job_application',
      OLD.id,
      jsonb_build_object(
        'company', OLD.company,
        'job_title', OLD.job_title,
        'status', OLD.status,
        'deleted_at', now()
      )
    FROM candidate_profiles cp
    WHERE cp.id = OLD.profile_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    INSERT INTO audit_logs (
      user_id,
      org_id,
      action,
      target_type,
      target_id,
      meta_json
    )
    SELECT 
      cp.user_id,
      cp.org_id,
      'soft_delete_job_application',
      'job_application',
      NEW.id,
      jsonb_build_object(
        'company', NEW.company,
        'job_title', NEW.job_title,
        'status', NEW.status,
        'deleted_at', NEW.deleted_at
      )
    FROM candidate_profiles cp
    WHERE cp.id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for job_applications
DROP TRIGGER IF EXISTS job_applications_audit_trigger ON job_applications;
CREATE TRIGGER job_applications_audit_trigger
AFTER UPDATE OR DELETE ON job_applications
FOR EACH ROW
EXECUTE FUNCTION audit_job_application_changes();