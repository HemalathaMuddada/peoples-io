-- Fix queue_email_notification to not fail when app.* settings are missing
CREATE OR REPLACE FUNCTION public.queue_email_notification(
  p_user_id uuid,
  p_org_id uuid,
  p_type text,
  p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
  v_supabase_url text;
  v_service_key text;
BEGIN
  -- Insert notification using enum casts where applicable
  INSERT INTO public.notifications (user_id, org_id, type, channel, payload_json)
  VALUES (
    p_user_id,
    p_org_id,
    p_type::public.notification_type,
    'email'::public.notification_channel,
    p_payload
  )
  RETURNING id INTO v_notification_id;

  -- Read settings safely; if not set, skip HTTP call
  v_supabase_url := current_setting('app.supabase_url', true);
  v_service_key := current_setting('app.supabase_service_role_key', true);

  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    BEGIN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object('notificationId', v_notification_id)
      );
    EXCEPTION WHEN OTHERS THEN
      -- Do not fail the transaction on email invocation errors
      RAISE NOTICE 'send-email invocation failed: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Skipping send-email call: app.supabase_url or service key not configured';
  END IF;

  RETURN v_notification_id;
END;
$$;