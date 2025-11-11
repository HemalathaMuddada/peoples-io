-- Ensure notification_type enum includes all used values
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'welcome';
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'agency_job_posted';
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'application_submitted';
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'interview_scheduled';
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'session_scheduled';
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'session_reminder';
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'feedback_request';
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'resume_analysis_complete';
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'achievement_unlocked';
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'learning_streak_milestone';
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'goal_progress_update';
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'mentorship_request_received';
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'mentorship_request_response';
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'job_match_alert';
END $$;

-- Make queue_email_notification use enum types
CREATE OR REPLACE FUNCTION public.queue_email_notification(p_user_id uuid, p_org_id uuid, p_type public.notification_type, p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Insert notification with email channel (enum-cast)
  INSERT INTO public.notifications (user_id, org_id, type, channel, payload_json)
  VALUES (p_user_id, p_org_id, p_type, 'email'::notification_channel, p_payload)
  RETURNING id INTO v_notification_id;
  
  -- Invoke send-email backend function asynchronously
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object('notificationId', v_notification_id)
  );
  
  RETURN v_notification_id;
END;
$function$;

-- Fix direct inserts into notifications to cast enums
CREATE OR REPLACE FUNCTION public.send_agency_job_post_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      -- Insert in-app notification (enum casts)
      INSERT INTO notifications (user_id, org_id, type, channel, payload_json)
      VALUES (
        v_employer_admin_id,
        v_employer_org_id,
        'agency_job_posted'::notification_type,
        'in_app'::notification_channel,
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
$function$;