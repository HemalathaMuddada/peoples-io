-- Fix ambiguous profile_id reference in RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.profile_achievements;
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.profile_achievements;

-- Recreate with explicit table references
CREATE POLICY "Users can insert their own achievements" 
ON public.profile_achievements
FOR INSERT
WITH CHECK (
  profile_achievements.profile_id IN (
    SELECT cp.id
    FROM public.candidate_profiles cp
    WHERE cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own achievements" 
ON public.profile_achievements
FOR SELECT
USING (
  profile_achievements.profile_id IN (
    SELECT cp.id
    FROM public.candidate_profiles cp
    WHERE cp.user_id = auth.uid()
  )
);