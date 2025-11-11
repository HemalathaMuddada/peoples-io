-- Create activity timeline view that aggregates all interaction types
CREATE OR REPLACE VIEW public.recruiter_activity_timeline AS
SELECT 
  'communication' as activity_type,
  cc.id,
  cc.sent_by as user_id,
  cc.application_id,
  cc.recipient_email,
  json_build_object(
    'subject', cc.subject,
    'template_id', cc.template_id,
    'template_name', mt.name
  ) as metadata,
  cc.sent_at as created_at
FROM candidate_communications cc
LEFT JOIN message_templates mt ON mt.id = cc.template_id

UNION ALL

SELECT 
  'stage_change' as activity_type,
  psh.id,
  psh.changed_by as user_id,
  psh.application_id,
  NULL as recipient_email,
  json_build_object(
    'from_stage', psh.from_stage,
    'to_stage', psh.to_stage,
    'duration', extract(epoch from psh.duration_in_stage)
  ) as metadata,
  psh.changed_at as created_at
FROM pipeline_stage_history psh

UNION ALL

SELECT 
  'application_created' as activity_type,
  ja.id,
  cp.user_id,
  ja.id as application_id,
  NULL as recipient_email,
  json_build_object(
    'job_title', ja.job_title,
    'company', ja.company,
    'status', ja.status
  ) as metadata,
  ja.applied_at as created_at
FROM job_applications ja
JOIN candidate_profiles cp ON cp.id = ja.profile_id

UNION ALL

SELECT 
  'interview_scheduled' as activity_type,
  i.id,
  NULL as user_id,
  i.application_id,
  i.interviewer_email as recipient_email,
  json_build_object(
    'interview_type', i.interview_type,
    'scheduled_at', i.scheduled_at,
    'location', i.location,
    'interviewer_name', i.interviewer_name,
    'duration_minutes', i.duration_minutes
  ) as metadata,
  i.created_at
FROM interviews i

UNION ALL

SELECT 
  'interview_feedback' as activity_type,
  if.id,
  if.submitted_by as user_id,
  if.interview_id as application_id,
  NULL as recipient_email,
  json_build_object(
    'rating_overall', if.rating_overall,
    'rating_technical', if.rating_technical,
    'rating_communication', if.rating_communication,
    'recommendation', if.recommendation,
    'strengths', if.strengths,
    'areas_for_improvement', if.areas_for_improvement
  ) as metadata,
  if.created_at
FROM interview_feedback if;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_candidate_communications_sent_at ON candidate_communications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_communications_sent_by ON candidate_communications(sent_by);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_history_changed_at ON pipeline_stage_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_created_at ON interviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_created_at ON interview_feedback(created_at DESC);
