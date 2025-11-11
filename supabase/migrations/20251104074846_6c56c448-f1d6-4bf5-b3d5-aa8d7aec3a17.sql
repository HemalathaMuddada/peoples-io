-- Fix the trigger to use correct task type
CREATE OR REPLACE FUNCTION trigger_match_generation_for_new_job()
RETURNS TRIGGER AS $$
DECLARE
  profile_record RECORD;
BEGIN
  -- For each candidate profile in the same org, regenerate matches
  FOR profile_record IN 
    SELECT id, user_id FROM candidate_profiles 
    WHERE org_id = NEW.org_id
  LOOP
    -- Create a job match task with the correct type enum
    INSERT INTO agent_tasks (
      user_id,
      org_id,
      type,
      status,
      input_json
    )
    VALUES (
      profile_record.user_id,
      NEW.org_id,
      'job_match',
      'pending',
      jsonb_build_object('profile_id', profile_record.id, 'new_job_id', NEW.id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;