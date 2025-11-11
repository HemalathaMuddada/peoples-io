-- Create recruiter_performance table to track metrics
CREATE TABLE IF NOT EXISTS public.recruiter_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  placements_count INTEGER NOT NULL DEFAULT 0,
  revenue_generated DECIMAL(10, 2) NOT NULL DEFAULT 0,
  applications_processed INTEGER NOT NULL DEFAULT 0,
  client_satisfaction_score DECIMAL(3, 2), -- 0.00 to 5.00
  active_clients_count INTEGER NOT NULL DEFAULT 0,
  jobs_posted INTEGER NOT NULL DEFAULT 0,
  response_time_hours DECIMAL(5, 2), -- Average response time
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recruiter_id, period_start, period_end)
);

-- Create index for performance queries
CREATE INDEX IF NOT EXISTS idx_recruiter_performance_recruiter 
  ON public.recruiter_performance(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_performance_period 
  ON public.recruiter_performance(period_start, period_end);

-- Create recruiter_badges table
CREATE TABLE IF NOT EXISTS public.recruiter_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL, -- top_performer, placement_master, client_champion, speed_demon, etc.
  badge_level TEXT NOT NULL, -- bronze, silver, gold, platinum
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recruiter_id, badge_type, period_start, period_end)
);

-- Create index for badge queries
CREATE INDEX IF NOT EXISTS idx_recruiter_badges_recruiter 
  ON public.recruiter_badges(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_badges_type 
  ON public.recruiter_badges(badge_type);

-- Enable RLS
ALTER TABLE public.recruiter_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_badges ENABLE ROW LEVEL SECURITY;

-- Agency admins can view all performance data
CREATE POLICY "Agency admins can view recruiter performance"
  ON public.recruiter_performance
  FOR SELECT
  USING (
    recruiter_id IN (
      SELECT user_id FROM public.user_roles
      WHERE org_id IN (
        SELECT org_id FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'agency_admin'
      )
    )
  );

-- Recruiters can view their own performance
CREATE POLICY "Recruiters can view own performance"
  ON public.recruiter_performance
  FOR SELECT
  USING (
    recruiter_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Agency admins can manage performance data
CREATE POLICY "Agency admins can manage recruiter performance"
  ON public.recruiter_performance
  FOR ALL
  USING (
    recruiter_id IN (
      SELECT user_id FROM public.user_roles
      WHERE org_id IN (
        SELECT org_id FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'agency_admin'
      )
    )
  );

-- Everyone in agency can view badges
CREATE POLICY "Agency members can view badges"
  ON public.recruiter_badges
  FOR SELECT
  USING (
    recruiter_id IN (
      SELECT user_id FROM public.user_roles
      WHERE org_id IN (
        SELECT org_id FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('agency_admin', 'recruiter')
      )
    )
  );

-- System can create badges (managed through functions/backend)
CREATE POLICY "System can create badges"
  ON public.recruiter_badges
  FOR INSERT
  WITH CHECK (true);

-- Platform admins can view all
CREATE POLICY "Platform admins can view all performance"
  ON public.recruiter_performance
  FOR SELECT
  USING (
    has_role(auth.uid(), 'platform_admin'::app_role)
  );

CREATE POLICY "Platform admins can view all badges"
  ON public.recruiter_badges
  FOR SELECT
  USING (
    has_role(auth.uid(), 'platform_admin'::app_role)
  );