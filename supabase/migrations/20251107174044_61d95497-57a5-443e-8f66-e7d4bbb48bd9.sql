-- Trigger: Send resume analysis complete email
CREATE OR REPLACE FUNCTION public.send_resume_analysis_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_strengths TEXT[];
  v_improvements TEXT[];
BEGIN
  -- Get user details from resume
  SELECT cp.user_id, cp.org_id
  INTO v_user_id, v_org_id
  FROM public.candidate_profiles cp
  WHERE cp.id = NEW.profile_id;
  
  -- Extract strengths and improvements from ats_feedback if available
  IF NEW.ats_feedback IS NOT NULL THEN
    v_strengths := ARRAY(SELECT jsonb_array_elements_text(NEW.ats_feedback->'strengths'));
    v_improvements := ARRAY(SELECT jsonb_array_elements_text(NEW.ats_feedback->'improvements'));
  END IF;
  
  -- Only send if score exists
  IF v_user_id IS NOT NULL AND NEW.ats_score IS NOT NULL THEN
    PERFORM public.queue_email_notification(
      v_user_id,
      v_org_id,
      'resume_analysis_complete',
      jsonb_build_object(
        'resumeScore', NEW.ats_score,
        'strengths', COALESCE(v_strengths, ARRAY[]::TEXT[]),
        'improvements', COALESCE(v_improvements, ARRAY[]::TEXT[])
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_resume_analyzed ON public.resumes;
CREATE TRIGGER on_resume_analyzed
  AFTER UPDATE OF ats_score ON public.resumes
  FOR EACH ROW
  WHEN (NEW.ats_score IS NOT NULL AND (OLD.ats_score IS NULL OR OLD.ats_score IS DISTINCT FROM NEW.ats_score))
  EXECUTE FUNCTION public.send_resume_analysis_email();

-- Trigger: Send achievement unlocked email
CREATE OR REPLACE FUNCTION public.send_achievement_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Get user details from profile
  SELECT cp.user_id, cp.org_id
  INTO v_user_id, v_org_id
  FROM public.candidate_profiles cp
  WHERE cp.id = NEW.profile_id;
  
  IF v_user_id IS NOT NULL THEN
    PERFORM public.queue_email_notification(
      v_user_id,
      v_org_id,
      'achievement_unlocked',
      jsonb_build_object(
        'achievementName', NEW.achievement_name,
        'achievementType', NEW.achievement_type,
        'achievementDescription', CASE 
          WHEN NEW.achievement_type = 'profile_created' THEN 'You created your professional profile!'
          WHEN NEW.achievement_type = 'quarter_complete' THEN 'Your profile is 25% complete!'
          WHEN NEW.achievement_type = 'half_complete' THEN 'Your profile is 50% complete!'
          WHEN NEW.achievement_type = 'three_quarter_complete' THEN 'Your profile is 75% complete!'
          WHEN NEW.achievement_type = 'fully_complete' THEN 'Your profile is 100% complete!'
          ELSE 'You unlocked a new achievement!'
        END
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_achievement_created ON public.profile_achievements;
CREATE TRIGGER on_achievement_created
  AFTER INSERT ON public.profile_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.send_achievement_email();

-- Trigger: Send learning streak milestone email
CREATE OR REPLACE FUNCTION public.send_learning_streak_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_is_milestone BOOLEAN;
BEGIN
  -- Check if this is a milestone (7, 30, 90, 365 days)
  v_is_milestone := NEW.current_streak IN (7, 30, 90, 365);
  
  IF v_is_milestone THEN
    -- Get user details from profile
    SELECT cp.user_id, cp.org_id
    INTO v_user_id, v_org_id
    FROM public.candidate_profiles cp
    WHERE cp.id = NEW.profile_id;
    
    IF v_user_id IS NOT NULL THEN
      PERFORM public.queue_email_notification(
        v_user_id,
        v_org_id,
        'learning_streak_milestone',
        jsonb_build_object(
          'streakDays', NEW.current_streak,
          'longestStreak', NEW.longest_streak
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_streak_updated ON public.learning_streaks;
CREATE TRIGGER on_streak_updated
  AFTER UPDATE OF current_streak ON public.learning_streaks
  FOR EACH ROW
  WHEN (NEW.current_streak > OLD.current_streak)
  EXECUTE FUNCTION public.send_learning_streak_email();

-- Trigger: Send goal progress update email
CREATE OR REPLACE FUNCTION public.send_goal_progress_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_is_milestone BOOLEAN;
  v_milestone_name TEXT;
BEGIN
  -- Check if progress crossed a milestone threshold (25%, 50%, 75%, 100%)
  v_is_milestone := 
    (OLD.progress < 25 AND NEW.progress >= 25) OR
    (OLD.progress < 50 AND NEW.progress >= 50) OR
    (OLD.progress < 75 AND NEW.progress >= 75) OR
    (OLD.progress < 100 AND NEW.progress >= 100);
  
  IF v_is_milestone THEN
    -- Determine milestone name
    v_milestone_name := CASE 
      WHEN NEW.progress >= 100 THEN 'Goal Complete! 🏆'
      WHEN NEW.progress >= 75 THEN '75% Complete'
      WHEN NEW.progress >= 50 THEN 'Halfway There!'
      WHEN NEW.progress >= 25 THEN '25% Complete'
      ELSE 'Progress Update'
    END;
    
    -- Get user details from profile
    SELECT cp.user_id, cp.org_id
    INTO v_user_id, v_org_id
    FROM public.candidate_profiles cp
    WHERE cp.id = NEW.profile_id;
    
    IF v_user_id IS NOT NULL THEN
      PERFORM public.queue_email_notification(
        v_user_id,
        v_org_id,
        'goal_progress_update',
        jsonb_build_object(
          'goalTitle', NEW.title,
          'progressPercentage', NEW.progress,
          'milestoneName', v_milestone_name
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_goal_progress_updated ON public.career_goals;
CREATE TRIGGER on_goal_progress_updated
  AFTER UPDATE OF progress ON public.career_goals
  FOR EACH ROW
  WHEN (NEW.progress > OLD.progress)
  EXECUTE FUNCTION public.send_goal_progress_email();