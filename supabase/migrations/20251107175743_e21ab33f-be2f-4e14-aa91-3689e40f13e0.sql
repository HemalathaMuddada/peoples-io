-- Create notification events tracking table
CREATE TABLE public.notification_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'failed')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app', 'push')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification events
CREATE POLICY "Users can view their own notification events"
  ON public.notification_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification events"
  ON public.notification_events
  FOR INSERT
  WITH CHECK (true);

-- Admins can view all events
CREATE POLICY "Platform admins can view all notification events"
  ON public.notification_events
  FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_notification_events_notification_id ON public.notification_events(notification_id);
CREATE INDEX idx_notification_events_user_id ON public.notification_events(user_id);
CREATE INDEX idx_notification_events_created_at ON public.notification_events(created_at);
CREATE INDEX idx_notification_events_type_channel ON public.notification_events(event_type, channel);

-- Function to automatically track notification sent events
CREATE OR REPLACE FUNCTION public.track_notification_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Track sent event for the notification
  INSERT INTO public.notification_events (notification_id, user_id, event_type, channel)
  VALUES (NEW.id, NEW.user_id, 'sent', NEW.channel);
  
  RETURN NEW;
END;
$$;

-- Trigger to track notification sends
CREATE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.track_notification_sent();

-- Function to get notification analytics
CREATE OR REPLACE FUNCTION public.get_notification_analytics(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  notification_type TEXT,
  channel TEXT,
  total_sent BIGINT,
  total_delivered BIGINT,
  total_opened BIGINT,
  total_clicked BIGINT,
  total_failed BIGINT,
  delivery_rate NUMERIC,
  open_rate NUMERIC,
  click_rate NUMERIC,
  click_through_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH notification_stats AS (
    SELECT 
      n.type as notification_type,
      n.channel,
      COUNT(DISTINCT CASE WHEN ne.event_type = 'sent' THEN ne.id END) as sent_count,
      COUNT(DISTINCT CASE WHEN ne.event_type = 'delivered' THEN ne.id END) as delivered_count,
      COUNT(DISTINCT CASE WHEN ne.event_type = 'opened' THEN ne.id END) as opened_count,
      COUNT(DISTINCT CASE WHEN ne.event_type = 'clicked' THEN ne.id END) as clicked_count,
      COUNT(DISTINCT CASE WHEN ne.event_type = 'failed' THEN ne.id END) as failed_count
    FROM public.notifications n
    LEFT JOIN public.notification_events ne ON ne.notification_id = n.id
    WHERE n.created_at >= p_start_date
      AND n.created_at <= p_end_date
      AND (p_user_id IS NULL OR n.user_id = p_user_id)
    GROUP BY n.type, n.channel
  )
  SELECT 
    notification_type,
    channel,
    sent_count,
    delivered_count,
    opened_count,
    clicked_count,
    failed_count,
    CASE WHEN sent_count > 0 
      THEN ROUND((delivered_count::NUMERIC / sent_count::NUMERIC) * 100, 2)
      ELSE 0 
    END as delivery_rate,
    CASE WHEN delivered_count > 0 
      THEN ROUND((opened_count::NUMERIC / delivered_count::NUMERIC) * 100, 2)
      ELSE 0 
    END as open_rate,
    CASE WHEN opened_count > 0 
      THEN ROUND((clicked_count::NUMERIC / opened_count::NUMERIC) * 100, 2)
      ELSE 0 
    END as click_rate,
    CASE WHEN sent_count > 0 
      THEN ROUND((clicked_count::NUMERIC / sent_count::NUMERIC) * 100, 2)
      ELSE 0 
    END as click_through_rate
  FROM notification_stats
  ORDER BY sent_count DESC;
END;
$$;

-- Function to get engagement trends over time
CREATE OR REPLACE FUNCTION public.get_notification_engagement_trends(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_granularity TEXT DEFAULT 'day'
)
RETURNS TABLE (
  time_bucket TIMESTAMP WITH TIME ZONE,
  total_sent BIGINT,
  total_opened BIGINT,
  total_clicked BIGINT,
  open_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interval TEXT;
BEGIN
  -- Determine interval based on granularity
  v_interval := CASE 
    WHEN p_granularity = 'hour' THEN '1 hour'
    WHEN p_granularity = 'day' THEN '1 day'
    WHEN p_granularity = 'week' THEN '1 week'
    WHEN p_granularity = 'month' THEN '1 month'
    ELSE '1 day'
  END;

  RETURN QUERY
  WITH time_series AS (
    SELECT 
      date_trunc(p_granularity, ne.created_at) as bucket,
      COUNT(DISTINCT CASE WHEN ne.event_type = 'sent' THEN ne.id END) as sent_count,
      COUNT(DISTINCT CASE WHEN ne.event_type = 'opened' THEN ne.id END) as opened_count,
      COUNT(DISTINCT CASE WHEN ne.event_type = 'clicked' THEN ne.id END) as clicked_count
    FROM public.notification_events ne
    WHERE ne.created_at >= p_start_date
      AND ne.created_at <= p_end_date
    GROUP BY bucket
    ORDER BY bucket
  )
  SELECT 
    bucket as time_bucket,
    sent_count,
    opened_count,
    clicked_count,
    CASE WHEN sent_count > 0 
      THEN ROUND((opened_count::NUMERIC / sent_count::NUMERIC) * 100, 2)
      ELSE 0 
    END as open_rate
  FROM time_series;
END;
$$;

-- Function to get user engagement summary
CREATE OR REPLACE FUNCTION public.get_user_engagement_summary(p_user_id UUID)
RETURNS TABLE (
  total_notifications_received BIGINT,
  total_opened BIGINT,
  total_clicked BIGINT,
  average_open_rate NUMERIC,
  most_engaged_type TEXT,
  least_engaged_type TEXT,
  preferred_channel TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      COUNT(DISTINCT n.id) as received,
      COUNT(DISTINCT CASE WHEN ne.event_type = 'opened' THEN ne.id END) as opened,
      COUNT(DISTINCT CASE WHEN ne.event_type = 'clicked' THEN ne.id END) as clicked
    FROM public.notifications n
    LEFT JOIN public.notification_events ne ON ne.notification_id = n.id
    WHERE n.user_id = p_user_id
  ),
  type_engagement AS (
    SELECT 
      n.type,
      COUNT(DISTINCT CASE WHEN ne.event_type = 'opened' THEN ne.id END)::NUMERIC / 
        NULLIF(COUNT(DISTINCT n.id), 0) as engagement_rate
    FROM public.notifications n
    LEFT JOIN public.notification_events ne ON ne.notification_id = n.id
    WHERE n.user_id = p_user_id
    GROUP BY n.type
  ),
  channel_preference AS (
    SELECT 
      n.channel,
      COUNT(*) as usage_count
    FROM public.notifications n
    WHERE n.user_id = p_user_id
    GROUP BY n.channel
    ORDER BY usage_count DESC
    LIMIT 1
  )
  SELECT 
    us.received,
    us.opened,
    us.clicked,
    CASE WHEN us.received > 0 
      THEN ROUND((us.opened::NUMERIC / us.received::NUMERIC) * 100, 2)
      ELSE 0 
    END,
    (SELECT type FROM type_engagement ORDER BY engagement_rate DESC LIMIT 1),
    (SELECT type FROM type_engagement ORDER BY engagement_rate ASC LIMIT 1),
    (SELECT channel FROM channel_preference)
  FROM user_stats us;
END;
$$;