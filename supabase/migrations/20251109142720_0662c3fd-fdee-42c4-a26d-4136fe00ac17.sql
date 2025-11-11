-- 1) Replace queue_email_notification to accept text and cast internally (more robust)
DROP FUNCTION IF EXISTS public.queue_email_notification(uuid, uuid, public.notification_type, jsonb);

CREATE OR REPLACE FUNCTION public.queue_email_notification(p_user_id uuid, p_org_id uuid, p_type text, p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Insert notification casting to enums
  INSERT INTO public.notifications (user_id, org_id, type, channel, payload_json)
  VALUES (
    p_user_id,
    p_org_id,
    p_type::public.notification_type,
    'email'::public.notification_channel,
    p_payload
  )
  RETURNING id INTO v_notification_id;
  
  -- Asynchronously call backend mailer
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

-- 2) Ensure welcome path uses valid enum value via text (now handled by function)
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.queue_email_notification(
    NEW.id,
    NEW.org_id,
    'welcome',
    '{}'::jsonb
  );
  RETURN NEW;
END;
$function$;

-- 3) Double-check initialize_notification_preferences still compiles (no change needed after step 1)
-- no-op
