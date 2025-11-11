-- Fix the trigger function to use qualified table references and disable RLS during trigger execution
CREATE OR REPLACE FUNCTION public.check_and_award_achievements()
RETURNS trigger
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
  
  -- Temporarily disable RLS for this function to avoid ambiguity
  SET LOCAL row_security = off;
  
  SELECT pa.id INTO existing_achievement
  FROM public.profile_achievements pa
  WHERE pa.profile_id = NEW.id AND pa.achievement_type = 'profile_created';
  
  IF existing_achievement IS NULL THEN
    INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
    VALUES (NEW.id, 'profile_created', 'Profile Creator');
  END IF;
  
  IF new_strength >= 25 THEN
    SELECT pa.id INTO existing_achievement
    FROM public.profile_achievements pa
    WHERE pa.profile_id = NEW.id AND pa.achievement_type = 'quarter_complete';
    
    IF existing_achievement IS NULL THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'quarter_complete', 'Getting Started');
    END IF;
  END IF;
  
  IF new_strength >= 50 THEN
    SELECT pa.id INTO existing_achievement
    FROM public.profile_achievements pa
    WHERE pa.profile_id = NEW.id AND pa.achievement_type = 'half_complete';
    
    IF existing_achievement IS NULL THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'half_complete', 'Halfway There');
    END IF;
  END IF;
  
  IF new_strength >= 75 THEN
    SELECT pa.id INTO existing_achievement
    FROM public.profile_achievements pa
    WHERE pa.profile_id = NEW.id AND pa.achievement_type = 'three_quarter_complete';
    
    IF existing_achievement IS NULL THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'three_quarter_complete', 'Almost Done');
    END IF;
  END IF;
  
  IF new_strength >= 100 THEN
    SELECT pa.id INTO existing_achievement
    FROM public.profile_achievements pa
    WHERE pa.profile_id = NEW.id AND pa.achievement_type = 'fully_complete';
    
    IF existing_achievement IS NULL THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'fully_complete', 'Profile Master');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;