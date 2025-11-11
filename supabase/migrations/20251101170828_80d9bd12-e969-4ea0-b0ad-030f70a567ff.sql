-- Qualify profile_id in RLS policies to avoid ambiguity across multiple tables
-- job_applications
DROP POLICY IF EXISTS "Users can manage their applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can view their applications" ON public.job_applications;

CREATE POLICY "Users can manage their applications"
ON public.job_applications
FOR ALL
USING (
  public.job_applications.profile_id IN (
    SELECT cp.id FROM public.candidate_profiles cp WHERE cp.user_id = auth.uid()
  )
)
WITH CHECK (
  public.job_applications.profile_id IN (
    SELECT cp.id FROM public.candidate_profiles cp WHERE cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their applications"
ON public.job_applications
FOR SELECT
USING (
  public.job_applications.profile_id IN (
    SELECT cp.id FROM public.candidate_profiles cp WHERE cp.user_id = auth.uid()
  )
);

-- job_matches
DROP POLICY IF EXISTS "Users access own matches" ON public.job_matches;
CREATE POLICY "Users access own matches"
ON public.job_matches
FOR ALL
USING (
  public.job_matches.profile_id IN (
    SELECT cp.id FROM public.candidate_profiles cp WHERE cp.user_id = auth.uid()
  )
)
WITH CHECK (
  public.job_matches.profile_id IN (
    SELECT cp.id FROM public.candidate_profiles cp WHERE cp.user_id = auth.uid()
  )
);

-- job_targets
DROP POLICY IF EXISTS "Users access own targets" ON public.job_targets;
CREATE POLICY "Users access own targets"
ON public.job_targets
FOR ALL
USING (
  public.job_targets.profile_id IN (
    SELECT cp.id FROM public.candidate_profiles cp WHERE cp.user_id = auth.uid()
  )
)
WITH CHECK (
  public.job_targets.profile_id IN (
    SELECT cp.id FROM public.candidate_profiles cp WHERE cp.user_id = auth.uid()
  )
);

-- profile_skills
DROP POLICY IF EXISTS "Users access own skills" ON public.profile_skills;
CREATE POLICY "Users access own skills"
ON public.profile_skills
FOR ALL
USING (
  public.profile_skills.profile_id IN (
    SELECT cp.id FROM public.candidate_profiles cp WHERE cp.user_id = auth.uid()
  )
)
WITH CHECK (
  public.profile_skills.profile_id IN (
    SELECT cp.id FROM public.candidate_profiles cp WHERE cp.user_id = auth.uid()
  )
);

-- recommendations
DROP POLICY IF EXISTS "Users access own recommendations" ON public.recommendations;
CREATE POLICY "Users access own recommendations"
ON public.recommendations
FOR ALL
USING (
  public.recommendations.profile_id IN (
    SELECT cp.id FROM public.candidate_profiles cp WHERE cp.user_id = auth.uid()
  )
)
WITH CHECK (
  public.recommendations.profile_id IN (
    SELECT cp.id FROM public.candidate_profiles cp WHERE cp.user_id = auth.uid()
  )
);

-- skill_gaps
DROP POLICY IF EXISTS "Users access own gaps" ON public.skill_gaps;
CREATE POLICY "Users access own gaps"
ON public.skill_gaps
FOR ALL
USING (
  public.skill_gaps.profile_id IN (
    SELECT cp.id FROM public.candidate_profiles cp WHERE cp.user_id = auth.uid()
  )
)
WITH CHECK (
  public.skill_gaps.profile_id IN (
    SELECT cp.id FROM public.candidate_profiles cp WHERE cp.user_id = auth.uid()
  )
);
