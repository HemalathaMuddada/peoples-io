-- Create function to send email notification
CREATE OR REPLACE FUNCTION public.queue_email_notification(
  p_user_id UUID,
  p_org_id UUID,
  p_type TEXT,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Insert notification with email channel
  INSERT INTO public.notifications (user_id, org_id, type, channel, payload_json)
  VALUES (p_user_id, p_org_id, p_type, 'email', p_payload)
  RETURNING id INTO v_notification_id;
  
  -- Invoke send-email edge function asynchronously
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
$$;

-- Trigger: Send welcome email on new user signup
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.queue_email_notification(
    NEW.id,
    NEW.org_id,
    'welcome',
    '{}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_send_welcome ON public.profiles;
CREATE TRIGGER on_profile_created_send_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email();

-- Trigger: Send application submitted email
CREATE OR REPLACE FUNCTION public.send_application_submitted_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Get user_id and org_id from candidate_profiles
  SELECT cp.user_id, cp.org_id
  INTO v_user_id, v_org_id
  FROM public.candidate_profiles cp
  WHERE cp.id = NEW.profile_id;
  
  IF v_user_id IS NOT NULL AND NEW.status = 'applied' THEN
    PERFORM public.queue_email_notification(
      v_user_id,
      v_org_id,
      'application_submitted',
      jsonb_build_object(
        'jobTitle', NEW.job_title,
        'company', NEW.company
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_application_submitted ON public.job_applications;
CREATE TRIGGER on_application_submitted
  AFTER INSERT ON public.job_applications
  FOR EACH ROW
  WHEN (NEW.status = 'applied')
  EXECUTE FUNCTION public.send_application_submitted_email();

-- Trigger: Send interview scheduled email
CREATE OR REPLACE FUNCTION public.send_interview_scheduled_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_job_title TEXT;
  v_company TEXT;
BEGIN
  -- Get user details from profile
  SELECT cp.user_id, cp.org_id, ja.job_title, ja.company
  INTO v_user_id, v_org_id, v_job_title, v_company
  FROM public.candidate_profiles cp
  JOIN public.job_applications ja ON ja.profile_id = cp.id
  WHERE ja.id = NEW.application_id;
  
  IF v_user_id IS NOT NULL THEN
    PERFORM public.queue_email_notification(
      v_user_id,
      v_org_id,
      'interview_scheduled',
      jsonb_build_object(
        'jobTitle', v_job_title,
        'company', v_company,
        'interviewDate', to_char(NEW.scheduled_at, 'FMMonth DD, YYYY'),
        'interviewTime', to_char(NEW.scheduled_at, 'HH12:MI AM'),
        'interviewType', NEW.interview_type,
        'location', NEW.location
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_interview_scheduled ON public.interview_schedules;
CREATE TRIGGER on_interview_scheduled
  AFTER INSERT ON public.interview_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.send_interview_scheduled_email();

-- Trigger: Send job match alert (batch notification)
CREATE OR REPLACE FUNCTION public.send_job_match_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_match_count INTEGER;
  v_top_matches JSONB;
BEGIN
  -- Get user info
  SELECT cp.user_id, cp.org_id
  INTO v_user_id, v_org_id
  FROM public.candidate_profiles cp
  WHERE cp.id = NEW.profile_id;
  
  -- Count total new matches for this profile
  SELECT COUNT(*)
  INTO v_match_count
  FROM public.job_matches
  WHERE profile_id = NEW.profile_id
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Only send if this is a meaningful batch (5+ matches)
  IF v_match_count >= 5 THEN
    -- Get top 3 matches
    SELECT jsonb_agg(
      jsonb_build_object(
        'title', jp.job_title,
        'company', jp.company,
        'location', jp.location,
        'matchScore', ROUND(jm.match_score)
      )
    )
    INTO v_top_matches
    FROM (
      SELECT * FROM public.job_matches
      WHERE profile_id = NEW.profile_id
      ORDER BY match_score DESC, created_at DESC
      LIMIT 3
    ) jm
    JOIN public.job_postings jp ON jp.id = jm.job_id;
    
    -- Check if we haven't sent an alert in the last 24 hours
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_user_id
        AND type = 'job_match_alert'
        AND created_at > NOW() - INTERVAL '24 hours'
    ) THEN
      PERFORM public.queue_email_notification(
        v_user_id,
        v_org_id,
        'job_match_alert',
        jsonb_build_object(
          'matchCount', v_match_count,
          'topMatches', v_top_matches
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_job_match_created ON public.job_matches;
CREATE TRIGGER on_job_match_created
  AFTER INSERT ON public.job_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.send_job_match_alert();