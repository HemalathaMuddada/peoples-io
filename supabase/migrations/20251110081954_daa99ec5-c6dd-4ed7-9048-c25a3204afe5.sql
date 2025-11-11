-- Create a post-signup repair RPC that validates and repairs user data
CREATE OR REPLACE FUNCTION public.repair_user_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
  v_org_id UUID;
  v_has_profile BOOLEAN;
  v_has_role BOOLEAN;
  v_has_prefs BOOLEAN;
  v_repairs JSONB := jsonb_build_object();
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user details from auth
  SELECT email, raw_user_meta_data->>'full_name'
  INTO v_user_email, v_user_name
  FROM auth.users
  WHERE id = v_user_id;

  -- Check if user has a profile
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_user_id)
  INTO v_has_profile;

  -- Check if user has an org
  SELECT org_id INTO v_org_id
  FROM public.profiles
  WHERE id = v_user_id;

  -- Repair: Create org if missing
  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name)
    VALUES (COALESCE(v_user_name, v_user_email) || '''s Organization')
    RETURNING id INTO v_org_id;
    
    v_repairs := jsonb_set(v_repairs, '{org_created}', 'true'::jsonb);
  END IF;

  -- Repair: Create profile if missing
  IF NOT v_has_profile THEN
    INSERT INTO public.profiles (id, org_id, email, full_name)
    VALUES (v_user_id, v_org_id, v_user_email, v_user_name)
    ON CONFLICT (id) DO UPDATE
    SET org_id = COALESCE(public.profiles.org_id, v_org_id),
        email = COALESCE(public.profiles.email, v_user_email),
        full_name = COALESCE(public.profiles.full_name, v_user_name);
    
    v_repairs := jsonb_set(v_repairs, '{profile_created}', 'true'::jsonb);
  ELSE
    -- Update org_id if it was missing
    IF v_org_id IS NOT NULL THEN
      UPDATE public.profiles
      SET org_id = v_org_id
      WHERE id = v_user_id AND org_id IS NULL;
    END IF;
  END IF;

  -- Check if user has any roles
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = v_user_id)
  INTO v_has_role;

  -- Repair: Assign default candidate role if missing
  IF NOT v_has_role THEN
    INSERT INTO public.user_roles (user_id, org_id, role)
    VALUES (v_user_id, v_org_id, 'candidate')
    ON CONFLICT DO NOTHING;
    
    v_repairs := jsonb_set(v_repairs, '{role_created}', 'true'::jsonb);
  END IF;

  -- Check if user has notification preferences
  SELECT EXISTS(SELECT 1 FROM public.notification_preferences WHERE user_id = v_user_id)
  INTO v_has_prefs;

  -- Repair: Create default notification preferences if missing
  IF NOT v_has_prefs THEN
    INSERT INTO public.notification_preferences (user_id, notification_type, email_enabled, in_app_enabled, sound_enabled, push_enabled)
    VALUES
      (v_user_id, 'job_match', true, true, true, false),
      (v_user_id, 'message', true, true, true, false),
      (v_user_id, 'achievement', true, true, true, false),
      (v_user_id, 'interview_reminder', true, true, true, true),
      (v_user_id, 'application_deadline', true, true, true, true),
      (v_user_id, 'follow_up_reminder', true, true, false, false),
      (v_user_id, 'weekly_digest', true, false, false, false),
      (v_user_id, 'coaching_session', true, true, true, false),
      (v_user_id, 'learning_milestone', true, true, true, false),
      (v_user_id, 'company_insight', true, true, false, false)
    ON CONFLICT (user_id, notification_type) DO NOTHING;
    
    v_repairs := jsonb_set(v_repairs, '{preferences_created}', 'true'::jsonb);
  END IF;

  -- Return success with repair details
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'org_id', v_org_id,
    'repairs', v_repairs
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;