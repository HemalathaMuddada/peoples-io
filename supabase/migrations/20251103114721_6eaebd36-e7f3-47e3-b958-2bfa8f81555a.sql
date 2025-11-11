-- Retry: fully replace combined trigger/function and split into BEFORE (score) and AFTER (achievements)

-- Drop any triggers that might reference the old function
DROP TRIGGER IF EXISTS on_candidate_profile_update ON public.candidate_profiles;
DROP TRIGGER IF EXISTS on_candidate_profile_insert ON public.candidate_profiles;
DROP TRIGGER IF EXISTS trigger_profile_strength_calculation ON public.candidate_profiles;
DROP TRIGGER IF EXISTS trigger_award_profile_achievements ON public.candidate_profiles;

-- Drop legacy function with CASCADE to remove any lingering dependencies
DROP FUNCTION IF EXISTS public.update_profile_score_and_achievements() CASCADE;

-- Create score calculation function (BEFORE trigger)
CREATE OR REPLACE FUNCTION public.update_profile_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  strength INTEGER := 0;
  resume_count INTEGER := 0;
BEGIN
  IF NEW.headline IS NOT NULL AND NEW.headline <> '' THEN strength := strength + 10; END IF;
  IF NEW.location IS NOT NULL AND NEW.location <> '' THEN strength := strength + 5; END IF;
  IF NEW.current_title IS NOT NULL AND NEW.current_title <> '' THEN strength := strength + 10; END IF;
  IF COALESCE(NEW.years_experience, 0) > 0 THEN strength := strength + 5; END IF;
  IF NEW.seniority IS NOT NULL THEN strength := strength + 5; END IF;
  IF NEW.linkedin_url IS NOT NULL AND NEW.linkedin_url <> '' THEN strength := strength + 5; END IF;
  IF NEW.target_titles IS NOT NULL AND array_length(NEW.target_titles, 1) > 0 THEN strength := strength + 20; END IF;
  IF NEW.salary_range_min IS NOT NULL AND NEW.salary_range_max IS NOT NULL THEN strength := strength + 10; END IF;

  IF NEW.id IS NOT NULL THEN
    SELECT COUNT(*) INTO resume_count FROM public.resumes r WHERE r.profile_id = NEW.id;
    IF resume_count > 0 THEN strength := strength + 30; END IF;
  END IF;

  IF strength > 100 THEN strength := 100; END IF;
  NEW.profile_score := strength;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_profile_strength_calculation
BEFORE INSERT OR UPDATE ON public.candidate_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_profile_score();

-- Create achievements function (AFTER trigger)
CREATE OR REPLACE FUNCTION public.award_profile_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  existing_achievement UUID;
  strength INTEGER := COALESCE(NEW.profile_score, 0);
BEGIN
  -- Ensure idempotency for each achievement
  PERFORM 1 FROM public.profile_achievements WHERE profile_id = NEW.id AND achievement_type = 'profile_created';
  IF NOT FOUND THEN
    INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
    VALUES (NEW.id, 'profile_created', 'Profile Creator');
  END IF;

  IF strength >= 25 THEN
    PERFORM 1 FROM public.profile_achievements WHERE profile_id = NEW.id AND achievement_type = 'quarter_complete';
    IF NOT FOUND THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'quarter_complete', 'Getting Started');
    END IF;
  END IF;

  IF strength >= 50 THEN
    PERFORM 1 FROM public.profile_achievements WHERE profile_id = NEW.id AND achievement_type = 'half_complete';
    IF NOT FOUND THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'half_complete', 'Halfway There');
    END IF;
  END IF;

  IF strength >= 75 THEN
    PERFORM 1 FROM public.profile_achievements WHERE profile_id = NEW.id AND achievement_type = 'three_quarter_complete';
    IF NOT FOUND THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'three_quarter_complete', 'Almost Done');
    END IF;
  END IF;

  IF strength >= 100 THEN
    PERFORM 1 FROM public.profile_achievements WHERE profile_id = NEW.id AND achievement_type = 'fully_complete';
    IF NOT FOUND THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'fully_complete', 'Profile Master');
    END IF;
  END IF;

  RETURN NULL; -- AFTER trigger
END;
$$;

CREATE TRIGGER trigger_award_profile_achievements
AFTER INSERT OR UPDATE ON public.candidate_profiles
FOR EACH ROW EXECUTE FUNCTION public.award_profile_achievements();
