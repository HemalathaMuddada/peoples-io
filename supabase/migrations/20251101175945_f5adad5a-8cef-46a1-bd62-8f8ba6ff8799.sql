-- Update the trigger function to also handle achievements
CREATE OR REPLACE FUNCTION public.update_profile_score_and_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  strength INTEGER := 0;
  resume_count INTEGER := 0;
  existing_achievement UUID;
BEGIN
  -- Calculate strength inline
  IF NEW.headline IS NOT NULL AND NEW.headline != '' THEN
    strength := strength + 10;
  END IF;
  
  IF NEW.location IS NOT NULL AND NEW.location != '' THEN
    strength := strength + 5;
  END IF;
  
  IF NEW.current_title IS NOT NULL AND NEW.current_title != '' THEN
    strength := strength + 10;
  END IF;
  
  IF NEW.years_experience > 0 THEN
    strength := strength + 5;
  END IF;
  
  IF NEW.seniority IS NOT NULL THEN
    strength := strength + 5;
  END IF;
  
  IF NEW.linkedin_url IS NOT NULL AND NEW.linkedin_url != '' THEN
    strength := strength + 5;
  END IF;
  
  IF NEW.target_titles IS NOT NULL AND array_length(NEW.target_titles, 1) > 0 THEN
    strength := strength + 20;
  END IF;
  
  IF NEW.salary_range_min IS NOT NULL AND NEW.salary_range_max IS NOT NULL THEN
    strength := strength + 10;
  END IF;
  
  -- Count resumes for this profile
  IF NEW.id IS NOT NULL THEN
    SELECT COUNT(*) INTO resume_count
    FROM public.resumes r
    WHERE r.profile_id = NEW.id;
    
    IF resume_count > 0 THEN
      strength := strength + 30;
    END IF;
  END IF;
  
  IF strength > 100 THEN
    strength := 100;
  END IF;
  
  -- Set the calculated score
  NEW.profile_score := strength;
  
  -- Award achievements based on profile score
  -- Profile created achievement
  SELECT id INTO existing_achievement
  FROM public.profile_achievements
  WHERE profile_id = NEW.id AND achievement_type = 'profile_created';
  
  IF existing_achievement IS NULL THEN
    INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
    VALUES (NEW.id, 'profile_created', 'Profile Creator');
  END IF;
  
  -- 25% complete
  IF strength >= 25 THEN
    SELECT id INTO existing_achievement
    FROM public.profile_achievements
    WHERE profile_id = NEW.id AND achievement_type = 'quarter_complete';
    
    IF existing_achievement IS NULL THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'quarter_complete', 'Getting Started');
    END IF;
  END IF;
  
  -- 50% complete
  IF strength >= 50 THEN
    SELECT id INTO existing_achievement
    FROM public.profile_achievements
    WHERE profile_id = NEW.id AND achievement_type = 'half_complete';
    
    IF existing_achievement IS NULL THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'half_complete', 'Halfway There');
    END IF;
  END IF;
  
  -- 75% complete
  IF strength >= 75 THEN
    SELECT id INTO existing_achievement
    FROM public.profile_achievements
    WHERE profile_id = NEW.id AND achievement_type = 'three_quarter_complete';
    
    IF existing_achievement IS NULL THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'three_quarter_complete', 'Almost Done');
    END IF;
  END IF;
  
  -- 100% complete
  IF strength >= 100 THEN
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

-- Trigger a profile update to award any missing achievements
UPDATE public.candidate_profiles
SET updated_at = now();