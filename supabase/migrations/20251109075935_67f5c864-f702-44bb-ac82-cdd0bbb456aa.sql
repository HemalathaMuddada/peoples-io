-- Create recruiter client feedback table
CREATE TABLE IF NOT EXISTS public.recruiter_client_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.agency_client_relationships(id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL,
  employer_org_id UUID NOT NULL,
  submitted_by UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  categories JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_recruiter_feedback_recruiter ON public.recruiter_client_feedback(recruiter_id);
CREATE INDEX idx_recruiter_feedback_relationship ON public.recruiter_client_feedback(relationship_id);
CREATE INDEX idx_recruiter_feedback_employer ON public.recruiter_client_feedback(employer_org_id);

-- Enable RLS
ALTER TABLE public.recruiter_client_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recruiter_client_feedback
CREATE POLICY "Employers can create feedback for their recruiters"
  ON public.recruiter_client_feedback
  FOR INSERT
  WITH CHECK (
    employer_org_id IN (
      SELECT org_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('org_admin', 'hiring_manager')
    )
    AND submitted_by = auth.uid()
  );

CREATE POLICY "Employers can view feedback they submitted"
  ON public.recruiter_client_feedback
  FOR SELECT
  USING (
    employer_org_id IN (
      SELECT org_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('org_admin', 'hiring_manager')
    )
  );

CREATE POLICY "Recruiters can view feedback about them"
  ON public.recruiter_client_feedback
  FOR SELECT
  USING (
    recruiter_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Agency admins can view feedback for their recruiters"
  ON public.recruiter_client_feedback
  FOR SELECT
  USING (
    relationship_id IN (
      SELECT id FROM agency_client_relationships
      WHERE agency_org_id IN (
        SELECT org_id FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'agency_admin'
      )
    )
  );

CREATE POLICY "Platform admins can view all feedback"
  ON public.recruiter_client_feedback
  FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'));

-- Create function to update recruiter performance based on client feedback
CREATE OR REPLACE FUNCTION public.update_recruiter_performance_from_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_avg_rating NUMERIC;
  v_feedback_count INTEGER;
BEGIN
  -- Calculate average rating and count for this recruiter
  SELECT 
    AVG(rating)::NUMERIC,
    COUNT(*)::INTEGER
  INTO v_avg_rating, v_feedback_count
  FROM recruiter_client_feedback
  WHERE recruiter_id = NEW.recruiter_id;
  
  -- Update recruiter performance
  UPDATE recruiter_performance
  SET 
    avg_client_satisfaction = v_avg_rating,
    updated_at = now()
  WHERE recruiter_id = NEW.recruiter_id;
  
  -- If no performance record exists, this will be handled by the badge awarding system
  
  RETURN NEW;
END;
$$;

-- Create trigger to update performance when feedback is added
DROP TRIGGER IF EXISTS trigger_update_performance_from_feedback ON recruiter_client_feedback;
CREATE TRIGGER trigger_update_performance_from_feedback
  AFTER INSERT OR UPDATE ON recruiter_client_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_recruiter_performance_from_feedback();

-- Add updated_at trigger
CREATE TRIGGER update_recruiter_client_feedback_updated_at
  BEFORE UPDATE ON public.recruiter_client_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();