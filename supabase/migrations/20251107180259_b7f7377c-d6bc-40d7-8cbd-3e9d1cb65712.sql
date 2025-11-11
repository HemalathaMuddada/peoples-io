-- Fix search_path for security functions
ALTER FUNCTION public.get_user_optimal_send_time(UUID, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_next_optimal_send_time(UUID, TEXT, INT) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_engagement_patterns(UUID) SET search_path = public, pg_temp;