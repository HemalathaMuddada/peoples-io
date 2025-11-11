-- Create achievements table for gamification
CREATE TABLE IF NOT EXISTS public.profile_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_achievements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own achievements"
  ON public.profile_achievements
  FOR SELECT
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own achievements"
  ON public.profile_achievements
  FOR INSERT
  WITH CHECK (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_achievements_profile_id ON public.profile_achievements(profile_id);

-- Create function to calculate profile strength
CREATE OR REPLACE FUNCTION public.calculate_profile_strength(profile_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  strength INTEGER := 0;
  profile_data RECORD;
  resume_count INTEGER;
BEGIN
  -- Get profile data
  SELECT * INTO profile_data
  FROM public.candidate_profiles
  WHERE id = profile_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Basic info (40 points total)
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
  
  -- Target roles (20 points)
  IF profile_data.target_titles IS NOT NULL AND array_length(profile_data.target_titles, 1) > 0 THEN
    strength := strength + 20;
  END IF;
  
  -- Salary expectations (10 points)
  IF profile_data.salary_range_min IS NOT NULL AND profile_data.salary_range_max IS NOT NULL THEN
    strength := strength + 10;
  END IF;
  
  -- Resume uploaded (30 points)
  SELECT COUNT(*) INTO resume_count
  FROM public.resumes
  WHERE profile_id = calculate_profile_strength.profile_id;
  
  IF resume_count > 0 THEN
    strength := strength + 30;
  END IF;
  
  -- Cap at 100
  IF strength > 100 THEN
    strength := 100;
  END IF;
  
  RETURN strength;
END;
$$;

-- Create function to award achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_strength INTEGER;
  resume_count INTEGER;
  existing_achievement UUID;
BEGIN
  -- Calculate new profile strength
  new_strength := public.calculate_profile_strength(NEW.id);
  
  -- Update profile score
  UPDATE public.candidate_profiles
  SET profile_score = new_strength
  WHERE id = NEW.id;
  
  -- Award "Profile Creator" badge (created profile)
  SELECT id INTO existing_achievement
  FROM public.profile_achievements
  WHERE profile_id = NEW.id AND achievement_type = 'profile_created';
  
  IF existing_achievement IS NULL THEN
    INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
    VALUES (NEW.id, 'profile_created', 'Profile Creator');
  END IF;
  
  -- Award "Getting Started" badge (25% complete)
  IF new_strength >= 25 THEN
    SELECT id INTO existing_achievement
    FROM public.profile_achievements
    WHERE profile_id = NEW.id AND achievement_type = 'quarter_complete';
    
    IF existing_achievement IS NULL THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'quarter_complete', 'Getting Started');
    END IF;
  END IF;
  
  -- Award "Halfway There" badge (50% complete)
  IF new_strength >= 50 THEN
    SELECT id INTO existing_achievement
    FROM public.profile_achievements
    WHERE profile_id = NEW.id AND achievement_type = 'half_complete';
    
    IF existing_achievement IS NULL THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'half_complete', 'Halfway There');
    END IF;
  END IF;
  
  -- Award "Almost Done" badge (75% complete)
  IF new_strength >= 75 THEN
    SELECT id INTO existing_achievement
    FROM public.profile_achievements
    WHERE profile_id = NEW.id AND achievement_type = 'three_quarter_complete';
    
    IF existing_achievement IS NULL THEN
      INSERT INTO public.profile_achievements (profile_id, achievement_type, achievement_name)
      VALUES (NEW.id, 'three_quarter_complete', 'Almost Done');
    END IF;
  END IF;
  
  -- Award "Profile Master" badge (100% complete)
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

-- Create trigger to auto-calculate profile strength on profile updates
CREATE TRIGGER trigger_profile_strength_calculation
AFTER INSERT OR UPDATE ON public.candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_and_award_achievements();