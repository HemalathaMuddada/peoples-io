-- Trigger: Send mentorship request email to mentor
CREATE OR REPLACE FUNCTION public.send_mentorship_request_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mentor_org_id UUID;
  v_mentee_name TEXT;
BEGIN
  -- Get mentor org_id and mentee name
  SELECT p.org_id, mp.full_name
  INTO v_mentor_org_id, v_mentee_name
  FROM public.profiles p
  LEFT JOIN public.profiles mp ON mp.id = NEW.mentee_id
  WHERE p.id = NEW.mentor_id;
  
  IF v_mentor_org_id IS NOT NULL THEN
    PERFORM public.queue_email_notification(
      NEW.mentor_id,
      v_mentor_org_id,
      'mentorship_request_received',
      jsonb_build_object(
        'menteeName', v_mentee_name,
        'message', NEW.message
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_mentorship_request_created ON public.mentorship_requests;
CREATE TRIGGER on_mentorship_request_created
  AFTER INSERT ON public.mentorship_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.send_mentorship_request_email();

-- Trigger: Send mentorship response email to mentee
CREATE OR REPLACE FUNCTION public.send_mentorship_response_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mentee_org_id UUID;
  v_mentor_name TEXT;
BEGIN
  -- Only trigger on status change to accepted or declined
  IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'declined') THEN
    -- Get mentee org_id and mentor name
    SELECT p.org_id, mp.full_name
    INTO v_mentee_org_id, v_mentor_name
    FROM public.profiles p
    LEFT JOIN public.profiles mp ON mp.id = NEW.mentor_id
    WHERE p.id = NEW.mentee_id;
    
    IF v_mentee_org_id IS NOT NULL THEN
      PERFORM public.queue_email_notification(
        NEW.mentee_id,
        v_mentee_org_id,
        'mentorship_request_response',
        jsonb_build_object(
          'mentorName', v_mentor_name,
          'status', NEW.status,
          'responseMessage', NEW.response_message
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_mentorship_response ON public.mentorship_requests;
CREATE TRIGGER on_mentorship_response
  AFTER UPDATE ON public.mentorship_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.send_mentorship_response_email();

-- Trigger: Send session scheduled email to both parties
CREATE OR REPLACE FUNCTION public.send_session_scheduled_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mentor_id UUID;
  v_mentee_id UUID;
  v_mentor_org_id UUID;
  v_mentee_org_id UUID;
  v_mentor_name TEXT;
  v_mentee_name TEXT;
BEGIN
  -- Get mentor and mentee details
  SELECT 
    mr.mentor_id, mr.mentee_id,
    pm.org_id, pme.org_id,
    pm.full_name, pme.full_name
  INTO 
    v_mentor_id, v_mentee_id,
    v_mentor_org_id, v_mentee_org_id,
    v_mentor_name, v_mentee_name
  FROM public.mentorship_requests mr
  JOIN public.profiles pm ON pm.id = mr.mentor_id
  JOIN public.profiles pme ON pme.id = mr.mentee_id
  WHERE mr.id = NEW.mentorship_request_id;
  
  -- Send email to mentor
  IF v_mentor_id IS NOT NULL THEN
    PERFORM public.queue_email_notification(
      v_mentor_id,
      v_mentor_org_id,
      'session_scheduled',
      jsonb_build_object(
        'otherPartyName', v_mentee_name,
        'scheduledDate', to_char(NEW.scheduled_at, 'FMMonth DD, YYYY'),
        'scheduledTime', to_char(NEW.scheduled_at, 'HH12:MI AM'),
        'meetingLink', NEW.meeting_link
      )
    );
  END IF;
  
  -- Send email to mentee
  IF v_mentee_id IS NOT NULL THEN
    PERFORM public.queue_email_notification(
      v_mentee_id,
      v_mentee_org_id,
      'session_scheduled',
      jsonb_build_object(
        'otherPartyName', v_mentor_name,
        'scheduledDate', to_char(NEW.scheduled_at, 'FMMonth DD, YYYY'),
        'scheduledTime', to_char(NEW.scheduled_at, 'HH12:MI AM'),
        'meetingLink', NEW.meeting_link
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_session_scheduled ON public.mentorship_sessions;
CREATE TRIGGER on_session_scheduled
  AFTER INSERT ON public.mentorship_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.send_session_scheduled_email();

-- Function to send session reminder (call this from a scheduled job)
CREATE OR REPLACE FUNCTION public.send_session_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_mentor_id UUID;
  v_mentee_id UUID;
  v_mentor_org_id UUID;
  v_mentee_org_id UUID;
  v_mentor_name TEXT;
  v_mentee_name TEXT;
BEGIN
  -- Find sessions happening in the next 1-2 hours
  FOR v_session IN 
    SELECT ms.* FROM public.mentorship_sessions ms
    WHERE ms.scheduled_at > NOW() + INTERVAL '50 minutes'
      AND ms.scheduled_at < NOW() + INTERVAL '70 minutes'
      AND ms.status = 'scheduled'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id IN (
          SELECT mr.mentor_id FROM public.mentorship_requests mr WHERE mr.id = ms.mentorship_request_id
          UNION
          SELECT mr.mentee_id FROM public.mentorship_requests mr WHERE mr.id = ms.mentorship_request_id
        )
        AND n.type = 'session_reminder'
        AND n.created_at > NOW() - INTERVAL '2 hours'
      )
  LOOP
    -- Get mentor and mentee details
    SELECT 
      mr.mentor_id, mr.mentee_id,
      pm.org_id, pme.org_id,
      pm.full_name, pme.full_name
    INTO 
      v_mentor_id, v_mentee_id,
      v_mentor_org_id, v_mentee_org_id,
      v_mentor_name, v_mentee_name
    FROM public.mentorship_requests mr
    JOIN public.profiles pm ON pm.id = mr.mentor_id
    JOIN public.profiles pme ON pme.id = mr.mentee_id
    WHERE mr.id = v_session.mentorship_request_id;
    
    -- Send reminder to mentor
    PERFORM public.queue_email_notification(
      v_mentor_id,
      v_mentor_org_id,
      'session_reminder',
      jsonb_build_object(
        'otherPartyName', v_mentee_name,
        'scheduledDate', to_char(v_session.scheduled_at, 'FMMonth DD, YYYY'),
        'scheduledTime', to_char(v_session.scheduled_at, 'HH12:MI AM'),
        'meetingLink', v_session.meeting_link
      )
    );
    
    -- Send reminder to mentee
    PERFORM public.queue_email_notification(
      v_mentee_id,
      v_mentee_org_id,
      'session_reminder',
      jsonb_build_object(
        'otherPartyName', v_mentor_name,
        'scheduledDate', to_char(v_session.scheduled_at, 'FMMonth DD, YYYY'),
        'scheduledTime', to_char(v_session.scheduled_at, 'HH12:MI AM'),
        'meetingLink', v_session.meeting_link
      )
    );
  END LOOP;
END;
$$;

-- Trigger: Send feedback request after session completion
CREATE OR REPLACE FUNCTION public.send_feedback_request_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mentor_id UUID;
  v_mentee_id UUID;
  v_mentor_org_id UUID;
  v_mentee_org_id UUID;
  v_mentor_name TEXT;
  v_mentee_name TEXT;
BEGIN
  -- Only trigger on status change to completed
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Get mentor and mentee details
    SELECT 
      mr.mentor_id, mr.mentee_id,
      pm.org_id, pme.org_id,
      pm.full_name, pme.full_name
    INTO 
      v_mentor_id, v_mentee_id,
      v_mentor_org_id, v_mentee_org_id,
      v_mentor_name, v_mentee_name
    FROM public.mentorship_requests mr
    JOIN public.profiles pm ON pm.id = mr.mentor_id
    JOIN public.profiles pme ON pme.id = mr.mentee_id
    WHERE mr.id = NEW.mentorship_request_id;
    
    -- Send feedback request to mentor
    IF v_mentor_id IS NOT NULL THEN
      PERFORM public.queue_email_notification(
        v_mentor_id,
        v_mentor_org_id,
        'feedback_request',
        jsonb_build_object(
          'otherPartyName', v_mentee_name,
          'sessionDate', to_char(NEW.scheduled_at, 'FMMonth DD, YYYY')
        )
      );
    END IF;
    
    -- Send feedback request to mentee
    IF v_mentee_id IS NOT NULL THEN
      PERFORM public.queue_email_notification(
        v_mentee_id,
        v_mentee_org_id,
        'feedback_request',
        jsonb_build_object(
          'otherPartyName', v_mentor_name,
          'sessionDate', to_char(NEW.scheduled_at, 'FMMonth DD, YYYY')
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_session_completed ON public.mentorship_sessions;
CREATE TRIGGER on_session_completed
  AFTER UPDATE ON public.mentorship_sessions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.send_feedback_request_email();