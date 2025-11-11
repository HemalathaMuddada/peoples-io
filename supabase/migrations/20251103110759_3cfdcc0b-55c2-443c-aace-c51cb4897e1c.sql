-- Add mentor-specific fields to candidate_profiles
ALTER TABLE public.candidate_profiles
ADD COLUMN IF NOT EXISTS expertise_areas text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mentor_bio text,
ADD COLUMN IF NOT EXISTS mentor_pricing text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS is_available_for_mentorship boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mentorship_capacity integer DEFAULT 5;

-- Create mentorship request status enum
CREATE TYPE public.mentorship_status AS ENUM ('pending', 'accepted', 'declined', 'completed', 'cancelled');

-- Create mentorship_requests table
CREATE TABLE public.mentorship_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.mentorship_status NOT NULL DEFAULT 'pending',
  message text,
  response_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  CONSTRAINT different_users CHECK (mentor_id != mentee_id)
);

-- Enable RLS on mentorship_requests
ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;

-- Mentees can create and view their own requests
CREATE POLICY "Mentees can create requests"
ON public.mentorship_requests
FOR INSERT
TO authenticated
WITH CHECK (mentee_id = auth.uid());

CREATE POLICY "Users can view their mentorship requests"
ON public.mentorship_requests
FOR SELECT
TO authenticated
USING (mentee_id = auth.uid() OR mentor_id = auth.uid());

-- Mentees can update their own pending requests
CREATE POLICY "Mentees can update their requests"
ON public.mentorship_requests
FOR UPDATE
TO authenticated
USING (mentee_id = auth.uid() AND status = 'pending');

-- Mentors can update requests where they are the mentor
CREATE POLICY "Mentors can respond to requests"
ON public.mentorship_requests
FOR UPDATE
TO authenticated
USING (mentor_id = auth.uid());

-- Create mentorship_sessions table
CREATE TABLE public.mentorship_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorship_request_id uuid NOT NULL REFERENCES public.mentorship_requests(id) ON DELETE CASCADE,
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'scheduled',
  meeting_link text,
  notes text,
  mentor_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS on mentorship_sessions
ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view sessions for their mentorships
CREATE POLICY "Users can view their mentorship sessions"
ON public.mentorship_sessions
FOR SELECT
TO authenticated
USING (
  mentorship_request_id IN (
    SELECT id FROM public.mentorship_requests
    WHERE mentee_id = auth.uid() OR mentor_id = auth.uid()
  )
);

-- Users can manage sessions for their accepted mentorships
CREATE POLICY "Users can manage their mentorship sessions"
ON public.mentorship_sessions
FOR ALL
TO authenticated
USING (
  mentorship_request_id IN (
    SELECT id FROM public.mentorship_requests
    WHERE (mentee_id = auth.uid() OR mentor_id = auth.uid())
    AND status = 'accepted'
  )
);

-- Create indexes for better performance
CREATE INDEX idx_mentorship_requests_mentor ON public.mentorship_requests(mentor_id);
CREATE INDEX idx_mentorship_requests_mentee ON public.mentorship_requests(mentee_id);
CREATE INDEX idx_mentorship_requests_status ON public.mentorship_requests(status);
CREATE INDEX idx_mentorship_sessions_request ON public.mentorship_sessions(mentorship_request_id);
CREATE INDEX idx_candidate_profiles_mentorship ON public.candidate_profiles(is_available_for_mentorship) WHERE is_available_for_mentorship = true;

-- Create trigger for updated_at
CREATE TRIGGER update_mentorship_requests_updated_at
BEFORE UPDATE ON public.mentorship_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentorship_sessions_updated_at
BEFORE UPDATE ON public.mentorship_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();