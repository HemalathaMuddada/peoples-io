-- Create learning streaks table
CREATE TABLE IF NOT EXISTS public.learning_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  total_learning_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id)
);

-- Create badges table
CREATE TABLE IF NOT EXISTS public.learning_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('streak', 'completion', 'time', 'mastery', 'milestone')),
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user badges (earned badges)
CREATE TABLE IF NOT EXISTS public.user_learning_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.learning_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.learning_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_learning_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view and manage their own streaks"
  ON public.learning_streaks
  FOR ALL
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Everyone can view badges"
  ON public.learning_badges
  FOR SELECT
  USING (true);

CREATE POLICY "Users can view their earned badges"
  ON public.user_learning_badges
  FOR SELECT
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can insert earned badges"
  ON public.user_learning_badges
  FOR INSERT
  WITH CHECK (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_learning_streaks_profile_id ON public.learning_streaks(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_badges_profile_id ON public.user_learning_badges(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_badges_badge_id ON public.user_learning_badges(badge_id);

-- Function to update streak
CREATE OR REPLACE FUNCTION public.update_learning_streak(p_profile_id UUID)
RETURNS void AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_total_days INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get current streak data
  SELECT last_activity_date, current_streak, longest_streak, total_learning_days
  INTO v_last_activity, v_current_streak, v_longest_streak, v_total_days
  FROM public.learning_streaks
  WHERE profile_id = p_profile_id;

  -- Initialize if no record exists
  IF NOT FOUND THEN
    INSERT INTO public.learning_streaks (profile_id, current_streak, longest_streak, last_activity_date, total_learning_days)
    VALUES (p_profile_id, 1, 1, v_today, 1);
    RETURN;
  END IF;

  -- If already logged today, do nothing
  IF v_last_activity = v_today THEN
    RETURN;
  END IF;

  -- Check if streak continues (yesterday) or breaks
  IF v_last_activity = v_today - INTERVAL '1 day' THEN
    -- Continue streak
    v_current_streak := v_current_streak + 1;
    v_total_days := v_total_days + 1;
    
    -- Update longest streak if needed
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
  ELSE
    -- Streak broken, restart
    v_current_streak := 1;
    v_total_days := v_total_days + 1;
  END IF;

  -- Update streak record
  UPDATE public.learning_streaks
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_activity_date = v_today,
    total_learning_days = v_total_days,
    updated_at = now()
  WHERE profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update streak when learning activity is logged
CREATE OR REPLACE FUNCTION public.trigger_update_streak()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.update_learning_streak(NEW.profile_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_streak_on_activity ON public.learning_activity_log;
CREATE TRIGGER trigger_streak_on_activity
  AFTER INSERT ON public.learning_activity_log
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_streak();

-- Insert default badges
INSERT INTO public.learning_badges (badge_key, name, description, icon, category, requirement_type, requirement_value, tier, points) VALUES
  -- Streak Badges
  ('streak_3', 'Getting Started', 'Complete 3 consecutive days of learning', '🔥', 'streak', 'current_streak', 3, 'bronze', 10),
  ('streak_7', 'Week Warrior', 'Maintain a 7-day learning streak', '⭐', 'streak', 'current_streak', 7, 'silver', 25),
  ('streak_14', 'Fortnight Fighter', 'Keep learning for 14 days straight', '💪', 'streak', 'current_streak', 14, 'gold', 50),
  ('streak_30', 'Monthly Master', 'Achieve a 30-day learning streak', '👑', 'streak', 'current_streak', 30, 'platinum', 100),
  ('streak_100', 'Century Champion', 'Incredible 100-day learning streak', '💎', 'streak', 'current_streak', 100, 'diamond', 500),
  
  -- Completion Badges
  ('courses_5', 'Course Starter', 'Complete 5 courses', '📚', 'completion', 'courses_completed', 5, 'bronze', 15),
  ('courses_10', 'Learning Enthusiast', 'Complete 10 courses', '🎓', 'completion', 'courses_completed', 10, 'silver', 30),
  ('courses_25', 'Knowledge Seeker', 'Complete 25 courses', '🏆', 'completion', 'courses_completed', 25, 'gold', 75),
  ('courses_50', 'Learning Master', 'Complete 50 courses', '⚡', 'completion', 'courses_completed', 50, 'platinum', 150),
  ('courses_100', 'Education Legend', 'Complete 100 courses', '🌟', 'completion', 'courses_completed', 100, 'diamond', 300),
  
  -- Time Badges
  ('time_10', 'Time Investor', 'Log 10 hours of learning', '⏰', 'time', 'hours_logged', 10, 'bronze', 10),
  ('time_50', 'Dedicated Learner', 'Log 50 hours of learning', '⌚', 'time', 'hours_logged', 50, 'silver', 25),
  ('time_100', 'Century of Learning', 'Log 100 hours of learning', '🕐', 'time', 'hours_logged', 100, 'gold', 50),
  ('time_250', 'Time Champion', 'Log 250 hours of learning', '⏳', 'time', 'hours_logged', 250, 'platinum', 125),
  ('time_500', 'Lifetime Learner', 'Log 500 hours of learning', '💫', 'time', 'hours_logged', 500, 'diamond', 250),
  
  -- Path Completion
  ('paths_1', 'Path Pioneer', 'Complete your first learning path', '🎯', 'milestone', 'paths_completed', 1, 'bronze', 20),
  ('paths_3', 'Triple Threat', 'Complete 3 learning paths', '🚀', 'milestone', 'paths_completed', 3, 'silver', 50),
  ('paths_5', 'Path Master', 'Complete 5 learning paths', '🏅', 'milestone', 'paths_completed', 5, 'gold', 100),
  ('paths_10', 'Learning Architect', 'Complete 10 learning paths', '🎖️', 'milestone', 'paths_completed', 10, 'platinum', 200),
  
  -- Total Learning Days
  ('days_30', 'Monthly Learner', 'Learn for 30 total days', '📅', 'milestone', 'total_learning_days', 30, 'silver', 30),
  ('days_60', 'Quarter Achiever', 'Learn for 60 total days', '📆', 'milestone', 'total_learning_days', 60, 'gold', 60),
  ('days_100', 'Centennial Scholar', 'Learn for 100 total days', '📊', 'milestone', 'total_learning_days', 100, 'platinum', 100),
  ('days_365', 'Year-Long Learner', 'Learn for 365 days', '🎉', 'milestone', 'total_learning_days', 365, 'diamond', 365)
ON CONFLICT (badge_key) DO NOTHING;

COMMENT ON TABLE public.learning_streaks IS 'Tracks user learning streaks and activity patterns';
COMMENT ON TABLE public.learning_badges IS 'Defines available badges for learning achievements';
COMMENT ON TABLE public.user_learning_badges IS 'Tracks badges earned by users';
