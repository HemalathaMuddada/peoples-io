-- Create a simplified trigger that calculates score inline without recursion
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
  
  RETURN NEW;
END;
$$;

-- Create BEFORE trigger
DROP TRIGGER IF EXISTS trigger_profile_strength_calculation ON public.candidate_profiles;
CREATE TRIGGER trigger_profile_strength_calculation
BEFORE INSERT OR UPDATE ON public.candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_score_and_achievements();

-- Update existing profiles
UPDATE public.candidate_profiles
SET updated_at = now();