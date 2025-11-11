
-- Drop the conflicting triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role();

-- Create a single consolidated function for user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  user_role app_role;
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

  -- Get the role from metadata, default to 'candidate'
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'selected_role')::app_role,
    'candidate'::app_role
  );

  -- Assign the selected role
  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (NEW.id, new_org_id, user_role);

  -- Check if user also wants to be a mentor
  is_mentor := COALESCE((NEW.raw_user_meta_data->>'sign_up_as_mentor')::boolean, false);
  
  IF is_mentor AND user_role != 'mentor' THEN
    -- Assign additional mentor role
    INSERT INTO public.user_roles (user_id, org_id, role)
    VALUES (NEW.id, new_org_id, 'mentor');
  END IF;

  RETURN NEW;
END;
$$;

-- Create the single trigger for user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
