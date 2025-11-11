-- Modify learning_path_courses to support AI-generated courses
ALTER TABLE public.learning_path_courses
  DROP CONSTRAINT IF EXISTS learning_path_courses_course_id_fkey,
  ALTER COLUMN course_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS estimated_hours INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_learning_path_courses_path_id ON public.learning_path_courses(learning_path_id);

-- Add comment to explain the dual structure
COMMENT ON TABLE public.learning_path_courses IS 'Stores both AI-generated courses (with inline data) and references to curated courses (via course_id)';
