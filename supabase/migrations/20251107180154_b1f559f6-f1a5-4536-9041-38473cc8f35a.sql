-- Create table for scheduled notifications
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app', 'push')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for scheduled_notifications
CREATE POLICY "Users can view their own scheduled notifications"
  ON public.scheduled_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert scheduled notifications"
  ON public.scheduled_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update scheduled notifications"
  ON public.scheduled_notifications FOR UPDATE
  USING (true);

-- Indexes
CREATE INDEX idx_scheduled_notifications_user_id ON public.scheduled_notifications(user_id);
CREATE INDEX idx_scheduled_notifications_scheduled_for ON public.scheduled_notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_scheduled_notifications_status ON public.scheduled_notifications(status);

-- Function to calculate user's optimal notification time based on engagement patterns
CREATE OR REPLACE FUNCTION public.get_user_optimal_send_time(p_user_id UUID, p_notification_type TEXT DEFAULT NULL)
RETURNS TABLE (
  hour_of_day INT,
  day_of_week INT,
  engagement_score NUMERIC,
  avg_open_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH user_events AS (
    SELECT 
      ne.created_at,
      ne.event_type,
      n.type,
      EXTRACT(HOUR FROM ne.created_at AT TIME ZONE 'UTC') AS hour,
      EXTRACT(DOW FROM ne.created_at AT TIME ZONE 'UTC') AS dow
    FROM public.notification_events ne
    JOIN public.notifications n ON n.id = ne.notification_id
    WHERE ne.user_id = p_user_id
      AND ne.event_type IN ('opened', 'clicked')
      AND (p_notification_type IS NULL OR n.type = p_notification_type)
      AND ne.created_at > now() - INTERVAL '30 days'
  ),
  engagement_by_time AS (
    SELECT
      hour::INT AS hour_of_day,
      dow::INT AS day_of_week,
      COUNT(*) AS engagement_count,
      COUNT(DISTINCT DATE(created_at)) AS active_days
    FROM user_events
    GROUP BY hour, dow
  )
  SELECT
    ebt.hour_of_day,
    ebt.day_of_week,
    (ebt.engagement_count::NUMERIC / GREATEST(ebt.active_days, 1)) AS engagement_score,
    (ebt.engagement_count::NUMERIC / GREATEST(
      (SELECT COUNT(*) FROM public.notification_events ne2 
       WHERE ne2.user_id = p_user_id 
       AND ne2.event_type = 'sent'
       AND EXTRACT(HOUR FROM ne2.created_at) = ebt.hour_of_day
       AND EXTRACT(DOW FROM ne2.created_at) = ebt.day_of_week), 1
    )) * 100 AS avg_open_rate
  FROM engagement_by_time ebt
  ORDER BY engagement_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next optimal send time for a user
CREATE OR REPLACE FUNCTION public.calculate_next_optimal_send_time(
  p_user_id UUID,
  p_notification_type TEXT DEFAULT NULL,
  p_min_delay_minutes INT DEFAULT 15
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_optimal_times RECORD;
  v_next_time TIMESTAMPTZ;
  v_current_time TIMESTAMPTZ := now();
  v_min_send_time TIMESTAMPTZ := v_current_time + (p_min_delay_minutes || ' minutes')::INTERVAL;
BEGIN
  -- Get user's optimal times
  SELECT * INTO v_optimal_times
  FROM public.get_user_optimal_send_time(p_user_id, p_notification_type)
  ORDER BY engagement_score DESC
  LIMIT 1;
  
  -- If no engagement history, default to 9 AM next day
  IF v_optimal_times IS NULL THEN
    v_next_time := date_trunc('day', v_current_time) + INTERVAL '1 day' + INTERVAL '9 hours';
  ELSE
    -- Calculate next occurrence of optimal time
    v_next_time := date_trunc('day', v_current_time) + 
                   (v_optimal_times.hour_of_day || ' hours')::INTERVAL;
    
    -- If that time has passed today, move to tomorrow
    IF v_next_time < v_min_send_time THEN
      v_next_time := v_next_time + INTERVAL '1 day';
    END IF;
    
    -- Adjust for day of week if specified
    IF v_optimal_times.day_of_week IS NOT NULL THEN
      WHILE EXTRACT(DOW FROM v_next_time) != v_optimal_times.day_of_week LOOP
        v_next_time := v_next_time + INTERVAL '1 day';
      END LOOP;
    END IF;
  END IF;
  
  RETURN v_next_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user engagement patterns summary
CREATE OR REPLACE FUNCTION public.get_user_engagement_patterns(p_user_id UUID)
RETURNS TABLE (
  best_hour INT,
  best_day TEXT,
  total_engagements BIGINT,
  avg_response_time_minutes NUMERIC,
  preferred_channel TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH engagement_data AS (
    SELECT
      EXTRACT(HOUR FROM ne.created_at) AS hour,
      EXTRACT(DOW FROM ne.created_at) AS dow,
      ne.channel,
      ne.event_type,
      ne.created_at,
      LAG(ne.created_at) OVER (PARTITION BY ne.notification_id ORDER BY ne.created_at) AS prev_event_time
    FROM public.notification_events ne
    WHERE ne.user_id = p_user_id
      AND ne.created_at > now() - INTERVAL '30 days'
  ),
  hourly_engagement AS (
    SELECT hour::INT, COUNT(*) AS cnt
    FROM engagement_data
    WHERE event_type IN ('opened', 'clicked')
    GROUP BY hour
    ORDER BY cnt DESC
    LIMIT 1
  ),
  daily_engagement AS (
    SELECT 
      CASE dow::INT
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
      END AS day_name,
      COUNT(*) AS cnt
    FROM engagement_data
    WHERE event_type IN ('opened', 'clicked')
    GROUP BY dow
    ORDER BY cnt DESC
    LIMIT 1
  ),
  channel_preference AS (
    SELECT channel, COUNT(*) AS cnt
    FROM engagement_data
    WHERE event_type IN ('opened', 'clicked')
    GROUP BY channel
    ORDER BY cnt DESC
    LIMIT 1
  ),
  response_times AS (
    SELECT 
      AVG(EXTRACT(EPOCH FROM (created_at - prev_event_time)) / 60) AS avg_minutes
    FROM engagement_data
    WHERE prev_event_time IS NOT NULL
      AND event_type = 'opened'
  )
  SELECT
    (SELECT hour FROM hourly_engagement) AS best_hour,
    (SELECT day_name FROM daily_engagement) AS best_day,
    (SELECT COUNT(*) FROM engagement_data WHERE event_type IN ('opened', 'clicked'))::BIGINT AS total_engagements,
    (SELECT COALESCE(avg_minutes, 0) FROM response_times) AS avg_response_time_minutes,
    (SELECT channel FROM channel_preference) AS preferred_channel;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;