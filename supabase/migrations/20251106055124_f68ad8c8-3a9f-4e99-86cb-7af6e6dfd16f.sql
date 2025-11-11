-- Create achievement definitions table
CREATE TABLE public.achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL, -- 'profile', 'application', 'interview', 'learning', 'networking', 'milestone'
  requirement_type TEXT NOT NULL, -- 'count', 'streak', 'completion'
  requirement_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL REFERENCES achievement_definitions(achievement_key) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, achievement_key)
);

-- Create user points table
CREATE TABLE public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  points_to_next_level INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user streaks table
CREATE TABLE public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_type TEXT NOT NULL DEFAULT 'general', -- 'application', 'networking', 'learning', 'general'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create leaderboard cohorts table
CREATE TABLE public.leaderboard_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cohort_type TEXT NOT NULL, -- 'org', 'role', 'experience', 'custom'
  criteria JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user cohorts table
CREATE TABLE public.user_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES leaderboard_cohorts(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, cohort_id)
);

-- Create activity log table for tracking gamification events
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'profile_update', 'application_submitted', 'interview_completed', etc.
  points_earned INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievement_definitions (publicly readable)
CREATE POLICY "Everyone can view achievement definitions"
  ON public.achievement_definitions FOR SELECT
  USING (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements"
  ON public.user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_points
CREATE POLICY "Users can view their own points"
  ON public.user_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own points"
  ON public.user_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own points"
  ON public.user_points FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_streaks
CREATE POLICY "Users can view their own streaks"
  ON public.user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own streaks"
  ON public.user_streaks FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for leaderboard_cohorts (publicly readable)
CREATE POLICY "Everyone can view cohorts"
  ON public.leaderboard_cohorts FOR SELECT
  USING (true);

-- RLS Policies for user_cohorts
CREATE POLICY "Users can view their own cohorts"
  ON public.user_cohorts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can join cohorts"
  ON public.user_cohorts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for activity_log
CREATE POLICY "Users can view their own activity log"
  ON public.activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX idx_user_streaks_user_id ON public.user_streaks(user_id);
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- Create updated_at trigger for user_points
CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON public.user_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for user_streaks
CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default achievement definitions
INSERT INTO public.achievement_definitions (achievement_key, name, description, icon, points, category, requirement_type, requirement_value) VALUES
  ('profile_complete_25', 'Getting Started', 'Complete 25% of your profile', 'Target', 10, 'profile', 'completion', 25),
  ('profile_complete_50', 'Halfway There', 'Complete 50% of your profile', 'Award', 25, 'profile', 'completion', 50),
  ('profile_complete_75', 'Almost Perfect', 'Complete 75% of your profile', 'Star', 50, 'profile', 'completion', 75),
  ('profile_complete_100', 'Profile Master', 'Complete 100% of your profile', 'Trophy', 100, 'profile', 'completion', 100),
  ('first_application', 'First Step', 'Submit your first application', 'Send', 20, 'application', 'count', 1),
  ('applications_10', 'Persistent', 'Submit 10 applications', 'Zap', 50, 'application', 'count', 10),
  ('applications_25', 'Go-Getter', 'Submit 25 applications', 'Target', 100, 'application', 'count', 25),
  ('applications_50', 'Unstoppable', 'Submit 50 applications', 'Rocket', 200, 'application', 'count', 50),
  ('first_interview', 'Interview Ready', 'Complete your first interview', 'MessageSquare', 50, 'interview', 'count', 1),
  ('interviews_5', 'Interview Pro', 'Complete 5 interviews', 'Award', 100, 'interview', 'count', 5),
  ('streak_7', 'Week Warrior', 'Maintain a 7-day activity streak', 'Flame', 75, 'milestone', 'streak', 7),
  ('streak_30', 'Monthly Master', 'Maintain a 30-day activity streak', 'TrendingUp', 200, 'milestone', 'streak', 30),
  ('network_10', 'Connector', 'Connect with 10 people', 'Users', 50, 'networking', 'count', 10),
  ('learning_path_complete', 'Lifelong Learner', 'Complete a learning path', 'GraduationCap', 100, 'learning', 'completion', 1);