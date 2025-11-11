-- Create career goals table
CREATE TABLE public.career_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'skill', 'role', 'salary', 'education', 'project'
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  progress INTEGER DEFAULT 0, -- 0-100
  milestones JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create mock interviews table
CREATE TABLE public.mock_interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB DEFAULT '[]'::jsonb,
  feedback JSONB,
  score INTEGER,
  duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create learning paths table to link skill gaps with courses
CREATE TABLE public.learning_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  skill_gap_id UUID REFERENCES public.skill_gaps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  estimated_hours INTEGER,
  progress INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'paused'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create learning path courses junction table
CREATE TABLE public.learning_path_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learning_path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.career_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for career_goals
CREATE POLICY "Users can manage their own goals"
  ON public.career_goals
  FOR ALL
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

-- RLS Policies for mock_interviews
CREATE POLICY "Users can manage their own mock interviews"
  ON public.mock_interviews
  FOR ALL
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

-- RLS Policies for learning_paths
CREATE POLICY "Users can manage their own learning paths"
  ON public.learning_paths
  FOR ALL
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

-- RLS Policies for learning_path_courses
CREATE POLICY "Users can manage their learning path courses"
  ON public.learning_path_courses
  FOR ALL
  USING (learning_path_id IN (
    SELECT id FROM public.learning_paths WHERE profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (learning_path_id IN (
    SELECT id FROM public.learning_paths WHERE profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
  ));

-- Triggers for updated_at
CREATE TRIGGER update_career_goals_updated_at
  BEFORE UPDATE ON public.career_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learning_paths_updated_at
  BEFORE UPDATE ON public.learning_paths
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_career_goals_profile_id ON public.career_goals(profile_id);
CREATE INDEX idx_career_goals_status ON public.career_goals(status);
CREATE INDEX idx_mock_interviews_profile_id ON public.mock_interviews(profile_id);
CREATE INDEX idx_learning_paths_profile_id ON public.learning_paths(profile_id);
CREATE INDEX idx_learning_path_courses_path_id ON public.learning_path_courses(learning_path_id);