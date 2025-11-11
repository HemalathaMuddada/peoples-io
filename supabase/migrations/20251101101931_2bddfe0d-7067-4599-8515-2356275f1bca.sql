-- Fix security warnings by properly dropping and recreating functions with search_path

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_profile_strength_calculation ON public.candidate_profiles;

-- Drop functions
DROP FUNCTION IF EXISTS public.check_and_award_achievements();
DROP FUNCTION IF EXISTS public.calculate_profile_strength(UUID);

-- Recreate calculate_profile_strength with proper search_path
CREATE OR REPLACE FUNCTION public.calculate_profile_strength(profile_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  strength INTEGER := 0;
  profile_data RECORD;
  resume_count INTEGER;
BEGIN
  SELECT * INTO profile_data
  FROM public.candidate_profiles
  WHERE id = profile_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  IF profile_data.headline IS NOT NULL AND profile_data.headline != '' THEN
    strength := strength + 10;
  END IF;
  
  IF profile_data.location IS NOT NULL AND profile_data.location != '' THEN
    strength := strength + 5;
  END IF;
  
  IF profile_data.current_title IS NOT NULL AND profile_data.current_title != '' THEN
    strength := strength + 10;
  END IF;
  
  IF profile_data.years_experience > 0 THEN
    strength := strength + 5;
  END IF;
  
  IF profile_data.seniority IS NOT NULL THEN
    strength := strength + 5;
  END IF;
  
  IF profile_data.linkedin_url IS NOT NULL AND profile_data.linkedin_url != '' THEN
    strength := strength + 5;
  END IF;
  
  IF profile_data.target_titles IS NOT NULL AND array_length(profile_data.target_titles, 1) > 0 THEN
    strength := strength + 20;
  END IF;
  
  IF profile_data.salary_range_min IS NOT NULL AND profile_data.salary_range_max IS NOT NULL THEN
    strength := strength + 10;
  END IF;
  
  SELECT COUNT(*) INTO resume_count
  FROM public.resumes
  WHERE profile_id = calculate_profile_strength.profile_id;
  
  IF resume_count > 0 THEN
    strength := strength + 30;
  END IF;
  
  IF strength > 100 THEN
    strength := 100;
  END IF;
  
  RETURN strength;
END;
$$;

-- Recreate check_and_award_achievements with proper search_path
CREATE OR REPLACE FUNCTION public.check_and_award_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_strength INTEGER;
  existing_achievement UUID;
BEGIN
  new_strength := public.calculate_profile_strength(NEW.id);
  
  UPDATE public.candidate_profiles
  SET profile_score = new_strength
  WHERE id = NEW.id;
  
  SELECT id INTO existing_achievement
  FROM public.profile_achievements
  WHERE profile_id = NEW.id AND achievement_type = 'profile_created';
  
  IF existing_achievement IS NULL THEN
    INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
    VALUES (NEW.id, 'profile_created', 'Profile Creator');
  END IF;
  
  IF new_strength >= 25 THEN
    SELECT id INTO existing_achievement
    FROM public.profile_achievements
    WHERE profile_id = NEW.id AND achievement_type = 'quarter_complete';
    
    IF existing_achievement IS NULL THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'quarter_complete', 'Getting Started');
    END IF;
  END IF;
  
  IF new_strength >= 50 THEN
    SELECT id INTO existing_achievement
    FROM public.profile_achievements
    WHERE profile_id = NEW.id AND achievement_type = 'half_complete';
    
    IF existing_achievement IS NULL THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'half_complete', 'Halfway There');
    END IF;
  END IF;
  
  IF new_strength >= 75 THEN
    SELECT id INTO existing_achievement
    FROM public.profile_achievements
    WHERE profile_id = NEW.id AND achievement_type = 'three_quarter_complete';
    
    IF existing_achievement IS NULL THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'three_quarter_complete', 'Almost Done');
    END IF;
  END IF;
  
  IF new_strength >= 100 THEN
    SELECT id INTO existing_achievement
    FROM public.profile_achievements
    WHERE profile_id = NEW.id AND achievement_type = 'fully_complete';
    
    IF existing_achievement IS NULL THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'fully_complete', 'Profile Master');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trigger_profile_strength_calculation
AFTER INSERT OR UPDATE ON public.candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_and_award_achievements();