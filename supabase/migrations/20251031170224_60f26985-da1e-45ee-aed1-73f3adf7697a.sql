-- Fix: Security Definer View Warning
-- Views should use the querying user's permissions, not the creator's
-- This ensures RLS policies are properly enforced

-- Fix profiles_directory view to use security_invoker
ALTER VIEW public.profiles_directory SET (security_invoker = true);

-- Fix candidate_profiles_public view to use security_invoker
ALTER VIEW public.candidate_profiles_public SET (security_invoker = true);