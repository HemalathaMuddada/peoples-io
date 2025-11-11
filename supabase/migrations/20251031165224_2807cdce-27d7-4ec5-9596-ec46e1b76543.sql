-- Fix warning: Function Search Path Mutable
-- Add fixed search_path to SECURITY DEFINER functions to prevent search path attacks

-- Update has_role function with fixed search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role, _org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_org_id IS NULL OR org_id = _org_id)
  )
$function$;

-- Update get_user_org function with fixed search_path
CREATE OR REPLACE FUNCTION public.get_user_org(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT org_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$function$;

-- Fix warning: Extension in Public Schema
-- Move vector extension to dedicated extensions schema

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move vector extension from public to extensions schema
ALTER EXTENSION vector SET SCHEMA extensions;

-- Grant usage on extensions schema to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Note: Existing vector columns and indexes will continue to work
-- The extension functions are now in the extensions schema but accessible via search_path