-- 1) Ensure ON CONFLICT works by creating a unique index for (user_id, notification_type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preferences_user_type
ON public.notification_preferences (user_id, notification_type);

-- 2) Harden initialize_notification_preferences to avoid aborting signups
CREATE OR REPLACE FUNCTION public.initialize_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  BEGIN
    -- Insert default notification preferences for all notification types using text values
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
  EXCEPTION WHEN OTHERS THEN
    -- Do not block signup on preferences init failures
    RAISE NOTICE 'initialize_notification_preferences failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 3) Harden handle_new_user with safe casting and conflict handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id UUID;
  user_role app_role := 'candidate';
  raw_role TEXT;
  is_mentor BOOLEAN := false;
BEGIN
  BEGIN
    -- Safely derive role from metadata, default to 'candidate' on invalid values
    raw_role := COALESCE(NEW.raw_user_meta_data->>'selected_role', 'candidate');
    BEGIN
      user_role := raw_role::app_role;
    EXCEPTION WHEN OTHERS THEN
      user_role := 'candidate';
    END;

    -- Create organization for new user
    INSERT INTO public.organizations (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || '''s Organization')
    RETURNING id INTO new_org_id;

    -- Create profile if not exists
    INSERT INTO public.profiles (id, org_id, email, full_name)
    VALUES (
      NEW.id,
      new_org_id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Assign the selected role (idempotent)
    INSERT INTO public.user_roles (user_id, org_id, role)
    VALUES (NEW.id, new_org_id, user_role)
    ON CONFLICT DO NOTHING;

    -- Optionally assign mentor role
    is_mentor := COALESCE((NEW.raw_user_meta_data->>'sign_up_as_mentor')::boolean, false);
    IF is_mentor AND user_role != 'mentor' THEN
      INSERT INTO public.user_roles (user_id, org_id, role)
      VALUES (NEW.id, new_org_id, 'mentor')
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Do not block signup on org/profile/role init failures
    RAISE NOTICE 'handle_new_user failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;