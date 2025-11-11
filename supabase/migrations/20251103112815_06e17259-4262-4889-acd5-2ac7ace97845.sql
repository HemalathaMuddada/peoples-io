-- Update the handle_new_user trigger to check for mentor signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  is_mentor BOOLEAN;
BEGIN
  -- Create organization for new user
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || '''s Organization')
  RETURNING id INTO new_org_id;

  -- Create profile
  INSERT INTO public.profiles (id, org_id, email, full_name)
  VALUES (
    NEW.id,
    new_org_id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );

  -- Assign candidate role
  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (NEW.id, new_org_id, 'candidate');

  -- Check if user signed up as mentor
  is_mentor := COALESCE((NEW.raw_user_meta_data->>'sign_up_as_mentor')::boolean, false);
  
  IF is_mentor THEN
    -- Assign mentor role
    INSERT INTO public.user_roles (user_id, org_id, role)
    VALUES (NEW.id, new_org_id, 'mentor');
  END IF;

  RETURN NEW;
END;
$function$;