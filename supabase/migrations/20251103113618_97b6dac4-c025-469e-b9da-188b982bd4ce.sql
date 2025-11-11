-- Temporarily disable the trigger
DROP TRIGGER IF EXISTS on_candidate_profile_update ON public.candidate_profiles;
DROP TRIGGER IF EXISTS on_candidate_profile_insert ON public.candidate_profiles;

-- Recreate the trigger but only for updates, not inserts
CREATE TRIGGER on_candidate_profile_update
BEFORE UPDATE ON public.candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_score_and_achievements();