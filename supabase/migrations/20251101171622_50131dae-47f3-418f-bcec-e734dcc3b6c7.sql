-- Temporarily drop the trigger to isolate the RLS issue
DROP TRIGGER IF EXISTS trigger_profile_strength_calculation ON public.candidate_profiles;