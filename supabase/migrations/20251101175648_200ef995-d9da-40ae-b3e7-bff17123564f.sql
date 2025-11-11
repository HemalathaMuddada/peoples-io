-- Replace calculate_profile_strength safely (no triggers/backfill here)
DROP FUNCTION IF EXISTS public.calculate_profile_strength(uuid);

CREATE FUNCTION public.calculate_profile_strength(p_profile_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  strength INTEGER := 0;
  profile_data RECORD;
  resume_count INTEGER;
BEGIN
  SELECT * INTO profile_data
  FROM public.candidate_profiles
  WHERE id = p_profile_id;
  
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
  FROM public.resumes r
  WHERE r.profile_id = p_profile_id;
  
  IF resume_count > 0 THEN
    strength := strength + 30;
  END IF;
  
  IF strength > 100 THEN
    strength := 100;
  END IF;
  
  RETURN strength;
END;
$$;