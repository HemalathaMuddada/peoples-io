-- Add sound and push notification preferences to notification_preferences table
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT false;

-- Update the initialize_notification_preferences function to include new fields
CREATE OR REPLACE FUNCTION public.initialize_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default notification preferences for all notification types
  INSERT INTO public.notification_preferences (user_id, notification_type, email_enabled, in_app_enabled, sound_enabled, push_enabled)
  VALUES
    (NEW.id, 'job_match', true, true, true, false),
    (NEW.id, 'message', true, true, true, false),
    (NEW.id, 'achievement', true, true, true, false),
    (NEW.id, 'interview_reminder', true, true, true, true),
    (NEW.id, 'application_deadline', true, true, true, true),
    (NEW.id, 'follow_up_reminder', true, true, false, false),
    (NEW.id, 'weekly_digest', true, false, false, false),
    (NEW.id, 'coaching_session', true, true, true, false),
    (NEW.id, 'learning_milestone', true, true, true, false),
    (NEW.id, 'company_insight', true, true, false, false)
  ON CONFLICT (user_id, notification_type) DO NOTHING;
  
  RETURN NEW;
END;
$$;