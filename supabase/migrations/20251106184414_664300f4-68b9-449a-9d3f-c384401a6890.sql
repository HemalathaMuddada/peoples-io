-- Add time tracking and progress fields to learning paths
ALTER TABLE public.learning_path_courses
  ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add skill mastery tracking to learning paths
ALTER TABLE public.learning_paths
  ADD COLUMN IF NOT EXISTS total_time_spent_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skill_mastery_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create learning activity log for detailed tracking
CREATE TABLE IF NOT EXISTS public.learning_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  learning_path_id UUID REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.learning_path_courses(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('started', 'resumed', 'paused', 'completed', 'milestone_reached')),
  duration_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on learning activity log
ALTER TABLE public.learning_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for learning activity log
CREATE POLICY "Users can manage their own learning activity"
  ON public.learning_activity_log
  FOR ALL
  USING (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  ));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_learning_activity_profile_id ON public.learning_activity_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_learning_activity_path_id ON public.learning_activity_log(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_learning_activity_created_at ON public.learning_activity_log(created_at);

-- Function to update learning path progress
CREATE OR REPLACE FUNCTION public.update_learning_path_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update completion percentage and total time
  UPDATE public.learning_paths
  SET 
    completion_percentage = (
      SELECT ROUND((COUNT(*) FILTER (WHERE completed = true)::DECIMAL / COUNT(*)::DECIMAL) * 100)
      FROM public.learning_path_courses
      WHERE learning_path_id = NEW.learning_path_id
    ),
    total_time_spent_minutes = (
      SELECT COALESCE(SUM(time_spent_minutes), 0)
      FROM public.learning_path_courses
      WHERE learning_path_id = NEW.learning_path_id
    ),
    updated_at = now()
  WHERE id = NEW.learning_path_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update progress
DROP TRIGGER IF EXISTS trigger_update_learning_progress ON public.learning_path_courses;
CREATE TRIGGER trigger_update_learning_progress
  AFTER INSERT OR UPDATE ON public.learning_path_courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_learning_path_progress();

COMMENT ON TABLE public.learning_activity_log IS 'Tracks detailed learning activities for analytics and progress monitoring';
