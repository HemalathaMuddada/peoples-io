-- Create community posts table for forums/discussions
CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create community comments table
CREATE TABLE public.community_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create community post likes table
CREATE TABLE public.community_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create community comment likes table
CREATE TABLE public.community_comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Create resume review requests table
CREATE TABLE public.resume_review_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_role TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'completed', 'closed')),
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create resume review feedback table
CREATE TABLE public.resume_review_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_request_id UUID NOT NULL REFERENCES resume_review_requests(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT NOT NULL,
  strengths TEXT[],
  improvements TEXT[],
  is_helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create success stories table
CREATE TABLE public.success_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  story TEXT NOT NULL,
  company TEXT NOT NULL,
  job_title TEXT NOT NULL,
  salary_range TEXT,
  application_count INTEGER,
  interview_count INTEGER,
  timeline_weeks INTEGER,
  tips TEXT[],
  tags TEXT[] DEFAULT '{}',
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create success story likes table
CREATE TABLE public.success_story_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES success_stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Create success story comments table
CREATE TABLE public.success_story_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES success_stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create peer mentorship connections table
CREATE TABLE public.peer_mentorship_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'declined')),
  request_message TEXT,
  focus_areas TEXT[],
  meeting_frequency TEXT,
  total_sessions INTEGER DEFAULT 0,
  last_session_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(mentor_id, mentee_id)
);

-- Create peer mentorship sessions table
CREATE TABLE public.peer_mentorship_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES peer_mentorship_connections(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  notes TEXT,
  mentee_feedback TEXT,
  mentor_feedback TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_review_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.success_story_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.success_story_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_mentorship_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_mentorship_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_posts
CREATE POLICY "Anyone can view posts" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON public.community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for community_comments
CREATE POLICY "Anyone can view comments" ON public.community_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.community_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.community_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.community_comments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for community_post_likes
CREATE POLICY "Anyone can view post likes" ON public.community_post_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own post likes" ON public.community_post_likes FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for community_comment_likes
CREATE POLICY "Anyone can view comment likes" ON public.community_comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own comment likes" ON public.community_comment_likes FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for resume_review_requests
CREATE POLICY "Anyone can view open review requests" ON public.resume_review_requests FOR SELECT USING (true);
CREATE POLICY "Users can create review requests for their resumes" ON public.resume_review_requests FOR INSERT WITH CHECK (
  requester_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update their own review requests" ON public.resume_review_requests FOR UPDATE USING (
  requester_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete their own review requests" ON public.resume_review_requests FOR DELETE USING (
  requester_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
);

-- RLS Policies for resume_review_feedback
CREATE POLICY "Anyone can view feedback" ON public.resume_review_feedback FOR SELECT USING (true);
CREATE POLICY "Authenticated users can provide feedback" ON public.resume_review_feedback FOR INSERT WITH CHECK (
  reviewer_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Reviewers can update their own feedback" ON public.resume_review_feedback FOR UPDATE USING (
  reviewer_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Reviewers can delete their own feedback" ON public.resume_review_feedback FOR DELETE USING (
  reviewer_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
);

-- RLS Policies for success_stories
CREATE POLICY "Anyone can view success stories" ON public.success_stories FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create stories" ON public.success_stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stories" ON public.success_stories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stories" ON public.success_stories FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for success_story_likes
CREATE POLICY "Anyone can view story likes" ON public.success_story_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own story likes" ON public.success_story_likes FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for success_story_comments
CREATE POLICY "Anyone can view story comments" ON public.success_story_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.success_story_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.success_story_comments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for peer_mentorship_connections
CREATE POLICY "Users can view their mentorship connections" ON public.peer_mentorship_connections FOR SELECT USING (
  mentor_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()) OR
  mentee_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create mentorship requests" ON public.peer_mentorship_connections FOR INSERT WITH CHECK (
  mentee_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Mentors and mentees can update connections" ON public.peer_mentorship_connections FOR UPDATE USING (
  mentor_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()) OR
  mentee_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
);

-- RLS Policies for peer_mentorship_sessions
CREATE POLICY "Connection participants can view sessions" ON public.peer_mentorship_sessions FOR SELECT USING (
  connection_id IN (
    SELECT id FROM peer_mentorship_connections 
    WHERE mentor_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
       OR mentee_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "Connection participants can manage sessions" ON public.peer_mentorship_sessions FOR ALL USING (
  connection_id IN (
    SELECT id FROM peer_mentorship_connections 
    WHERE mentor_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
       OR mentee_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
  )
);

-- Create indexes for better performance
CREATE INDEX idx_community_posts_category ON public.community_posts(category);
CREATE INDEX idx_community_posts_user ON public.community_posts(user_id);
CREATE INDEX idx_community_comments_post ON public.community_comments(post_id);
CREATE INDEX idx_resume_review_status ON public.resume_review_requests(status);
CREATE INDEX idx_success_stories_featured ON public.success_stories(is_featured);
CREATE INDEX idx_peer_mentorship_status ON public.peer_mentorship_connections(status);

-- Create triggers for updated_at
CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_comments_updated_at
  BEFORE UPDATE ON public.community_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resume_review_requests_updated_at
  BEFORE UPDATE ON public.resume_review_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_success_stories_updated_at
  BEFORE UPDATE ON public.success_stories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_peer_mentorship_connections_updated_at
  BEFORE UPDATE ON public.peer_mentorship_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();