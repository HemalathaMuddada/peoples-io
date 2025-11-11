-- Function to notify employer when agency posts a job on their behalf
CREATE OR REPLACE FUNCTION public.send_agency_job_post_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_employer_admin_id UUID;
  v_employer_org_id UUID;
  v_agency_name TEXT;
BEGIN
  -- Only trigger for jobs posted by agencies
  IF NEW.posted_by_agency = true AND NEW.employer_org_id IS NOT NULL THEN
    -- Get employer org id
    v_employer_org_id := NEW.employer_org_id;
    
    -- Get agency name from posting org
    SELECT COALESCE(company_name, name) INTO v_agency_name
    FROM organizations
    WHERE id = NEW.posting_org_id;
    
    -- Get employer admin to notify (first org_admin found)
    SELECT user_id INTO v_employer_admin_id
    FROM user_roles
    WHERE org_id = v_employer_org_id
      AND role = 'org_admin'
    LIMIT 1;
    
    -- Send notification if we found an admin
    IF v_employer_admin_id IS NOT NULL THEN
      -- Insert in-app notification
      INSERT INTO notifications (user_id, org_id, type, channel, payload_json)
      VALUES (
        v_employer_admin_id,
        v_employer_org_id,
        'agency_job_posted',
        'in_app',
        jsonb_build_object(
          'jobTitle', NEW.job_title,
          'jobId', NEW.id,
          'agencyName', v_agency_name,
          'company', NEW.company,
          'location', NEW.location,
          'postedAt', NEW.created_at
        )
      );
      
      -- Queue email notification
      PERFORM queue_email_notification(
        v_employer_admin_id,
        v_employer_org_id,
        'agency_job_posted',
        jsonb_build_object(
          'jobTitle', NEW.job_title,
          'agencyName', v_agency_name,
          'company', NEW.company,
          'location', NEW.location,
          'postedDate', to_char(NEW.created_at, 'FMMonth DD, YYYY at HH12:MI AM')
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to notify agency when relationship status changes
CREATE OR REPLACE FUNCTION public.send_relationship_status_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency_admin_id UUID;
  v_employer_name TEXT;
  v_status_changed BOOLEAN;
BEGIN
  -- Check if status actually changed to approved or declined
  v_status_changed := (
    OLD.status = 'pending' AND 
    NEW.status IN ('approved', 'declined')
  );
  
  IF v_status_changed THEN
    -- Get employer name
    SELECT COALESCE(company_name, name) INTO v_employer_name
    FROM organizations
    WHERE id = NEW.employer_org_id;
    
    -- Get agency admin to notify (first agency_admin found)
    SELECT user_id INTO v_agency_admin_id
    FROM user_roles
    WHERE org_id = NEW.agency_org_id
      AND role = 'agency_admin'
    LIMIT 1;
    
    -- Send notification if we found an admin
    IF v_agency_admin_id IS NOT NULL THEN
      -- Insert in-app notification
      INSERT INTO notifications (user_id, org_id, type, channel, payload_json)
      VALUES (
        v_agency_admin_id,
        NEW.agency_org_id,
        CASE 
          WHEN NEW.status = 'approved' THEN 'relationship_approved'
          ELSE 'relationship_declined'
        END,
        'in_app',
        jsonb_build_object(
          'employerName', v_employer_name,
          'relationshipId', NEW.id,
          'status', NEW.status,
          'startDate', NEW.start_date,
          'reviewedAt', NEW.reviewed_at
        )
      );
      
      -- Queue email notification
      PERFORM queue_email_notification(
        v_agency_admin_id,
        NEW.agency_org_id,
        CASE 
          WHEN NEW.status = 'approved' THEN 'relationship_approved'
          ELSE 'relationship_declined'
        END,
        jsonb_build_object(
          'employerName', v_employer_name,
          'status', NEW.status,
          'startDate', to_char(NEW.start_date, 'FMMonth DD, YYYY'),
          'reviewedDate', to_char(NEW.reviewed_at, 'FMMonth DD, YYYY at HH12:MI AM'),
          'notes', NEW.notes
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for agency job postings
DROP TRIGGER IF EXISTS trigger_agency_job_post_notification ON job_postings;
CREATE TRIGGER trigger_agency_job_post_notification
  AFTER INSERT ON job_postings
  FOR EACH ROW
  EXECUTE FUNCTION send_agency_job_post_notification();

-- Create trigger for relationship status changes
DROP TRIGGER IF EXISTS trigger_relationship_status_notification ON agency_client_relationships;
CREATE TRIGGER trigger_relationship_status_notification
  AFTER UPDATE ON agency_client_relationships
  FOR EACH ROW
  EXECUTE FUNCTION send_relationship_status_notification();