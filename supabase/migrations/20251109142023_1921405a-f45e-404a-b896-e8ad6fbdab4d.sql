-- Fix the initialize_notification_preferences function to properly cast notification types
CREATE OR REPLACE FUNCTION public.initialize_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert default notification preferences for all notification types with proper enum casting
  INSERT INTO public.notification_preferences (user_id, notification_type, email_enabled, in_app_enabled, sound_enabled, push_enabled)
  VALUES
    (NEW.id, 'job_match'::notification_type, true, true, true, false),
    (NEW.id, 'message'::notification_type, true, true, true, false),
    (NEW.id, 'achievement'::notification_type, true, true, true, false),
    (NEW.id, 'interview_reminder'::notification_type, true, true, true, true),
    (NEW.id, 'application_deadline'::notification_type, true, true, true, true),
    (NEW.id, 'follow_up_reminder'::notification_type, true, true, false, false),
    (NEW.id, 'weekly_digest'::notification_type, true, false, false, false),
    (NEW.id, 'coaching_session'::notification_type, true, true, true, false),
    (NEW.id, 'learning_milestone'::notification_type, true, true, true, false),
    (NEW.id, 'company_insight'::notification_type, true, true, false, false)
  ON CONFLICT (user_id, notification_type) DO NOTHING;
  
  RETURN NEW;
END;
$function$;