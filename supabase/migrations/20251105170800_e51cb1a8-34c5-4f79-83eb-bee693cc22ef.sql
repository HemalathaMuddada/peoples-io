-- Revoke access to the materialized view from the API
REVOKE ALL ON public.event_analytics_summary FROM anon, authenticated;

-- Grant only necessary permissions to the service role
GRANT SELECT ON public.event_analytics_summary TO service_role;