-- Create table for caching scraped event data
CREATE TABLE IF NOT EXISTS public.event_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  markdown_content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read cached events
CREATE POLICY "Anyone can view cached events"
  ON public.event_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for system to manage cache (insert/update)
CREATE POLICY "System can manage event cache"
  ON public.event_cache
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index on url for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_cache_url ON public.event_cache(url);

-- Create index on created_at for cache expiry checks
CREATE INDEX IF NOT EXISTS idx_event_cache_created_at ON public.event_cache(created_at);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_event_cache_updated_at
  BEFORE UPDATE ON public.event_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();