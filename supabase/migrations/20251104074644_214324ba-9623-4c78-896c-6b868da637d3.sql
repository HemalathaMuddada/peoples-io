-- Create function to trigger match generation for all users when a new job is posted
CREATE OR REPLACE FUNCTION trigger_match_generation_for_new_job()
RETURNS TRIGGER AS $$
DECLARE
  profile_record RECORD;
BEGIN
  -- For each candidate profile in the same org, regenerate matches
  FOR profile_record IN 
    SELECT id FROM candidate_profiles 
    WHERE org_id = NEW.org_id
  LOOP
    -- Call the generate matches logic for each profile
    -- Note: This is a simplified version - in production you'd want to call the edge function
    -- For now, we'll insert a notification or task to regenerate matches
    INSERT INTO agent_tasks (
      user_id,
      org_id,
      type,
      status,
      input_json
    )
    SELECT 
      cp.user_id,
      cp.org_id,
      'generate_matches',
      'pending',
      jsonb_build_object('profile_id', cp.id, 'new_job_id', NEW.id)
    FROM candidate_profiles cp
    WHERE cp.id = profile_record.id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on job_postings table
DROP TRIGGER IF EXISTS on_job_posting_created ON job_postings;
CREATE TRIGGER on_job_posting_created
  AFTER INSERT ON job_postings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_match_generation_for_new_job();

-- Add a button notification system for admins
CREATE TABLE IF NOT EXISTS match_generation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id uuid REFERENCES job_postings(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS
ALTER TABLE match_generation_queue ENABLE ROW LEVEL SECURITY;

-- Allow system to manage queue
CREATE POLICY "System can manage queue" ON match_generation_queue
  FOR ALL
  USING (true);