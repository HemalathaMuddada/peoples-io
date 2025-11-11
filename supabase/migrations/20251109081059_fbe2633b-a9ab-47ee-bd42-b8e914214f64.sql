-- Add missing roles to the system
-- First, we need to add new enum values for the roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'recruiter';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agency_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'org_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hiring_manager';

-- Create a function to automatically assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Get the role from user metadata, default to 'candidate'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'selected_role')::app_role,
      'candidate'::app_role
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically assign role when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();