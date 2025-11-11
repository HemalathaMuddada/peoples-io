-- Create table for tracking event views/interactions
CREATE TABLE IF NOT EXISTS public.event_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_url TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_category TEXT,
  interaction_type TEXT NOT NULL, -- 'view', 'favorite', 'click'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_analytics ENABLE ROW LEVEL SECURITY;

-- Policy for inserting analytics (anyone can track)
CREATE POLICY "Anyone can insert event analytics"
  ON public.event_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy for viewing analytics (authenticated users can view aggregated data)
CREATE POLICY "Users can view event analytics"
  ON public.event_analytics
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_analytics_created_at ON public.event_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_event_analytics_category ON public.event_analytics(event_category);
CREATE INDEX IF NOT EXISTS idx_event_analytics_interaction_type ON public.event_analytics(interaction_type);
CREATE INDEX IF NOT EXISTS idx_event_analytics_event_url ON public.event_analytics(event_url);

-- Create a materialized view for faster analytics queries
CREATE MATERIALIZED VIEW IF NOT EXISTS public.event_analytics_summary AS
SELECT 
  DATE(created_at) as date,
  event_category,
  interaction_type,
  COUNT(*) as count
FROM public.event_analytics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), event_category, interaction_type;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_event_analytics_summary_date ON public.event_analytics_summary(date);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_event_analytics_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.event_analytics_summary;
END;
$$;