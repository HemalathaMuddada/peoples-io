-- Create table for storing user's favorite events
CREATE TABLE IF NOT EXISTS public.favorite_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_title TEXT NOT NULL,
  event_url TEXT NOT NULL,
  event_date TEXT,
  event_location TEXT,
  event_description TEXT,
  source_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_url)
);

-- Enable RLS
ALTER TABLE public.favorite_events ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own favorites
CREATE POLICY "Users can view their own favorite events"
  ON public.favorite_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for users to add favorites
CREATE POLICY "Users can add their own favorite events"
  ON public.favorite_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to remove favorites
CREATE POLICY "Users can remove their own favorite events"
  ON public.favorite_events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_favorite_events_user_id ON public.favorite_events(user_id);

-- Create index on event_url for checking if event is favorited
CREATE INDEX IF NOT EXISTS idx_favorite_events_event_url ON public.favorite_events(event_url);