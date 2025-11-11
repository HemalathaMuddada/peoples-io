-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create enums
CREATE TYPE app_role AS ENUM ('platform_admin', 'org_admin', 'coach', 'candidate');
CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'internship');
CREATE TYPE seniority_level AS ENUM ('entry', 'mid', 'senior', 'lead', 'executive');
CREATE TYPE application_status AS ENUM ('planned', 'applied', 'interview', 'offer', 'rejected');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');
CREATE TYPE task_type AS ENUM ('analyze_resume', 'generate_resume', 'linkedin_rewrite', 'job_match', 'interview_prep');
CREATE TYPE notification_type AS ENUM ('resume_parsed', 'job_match', 'application_reminder', 'coach_feedback');
CREATE TYPE notification_channel AS ENUM ('email', 'in_app');

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan subscription_plan DEFAULT 'free',
  seats INTEGER DEFAULT 1,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles (security definer approach)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, org_id, role)
);

-- Candidate Profiles
CREATE TABLE candidate_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  headline TEXT,
  location TEXT,
  years_experience INTEGER DEFAULT 0,
  current_title TEXT,
  target_titles TEXT[] DEFAULT '{}',
  target_locations TEXT[] DEFAULT '{}',
  work_authorization TEXT[] DEFAULT '{}',
  employment_type_prefs employment_type[] DEFAULT '{}',
  seniority seniority_level,
  salary_range_min INTEGER,
  salary_range_max INTEGER,
  resume_primary_id UUID,
  profile_score INTEGER DEFAULT 0,
  linkedin_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

-- Resumes
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'upload',
  file_url TEXT,
  file_name TEXT,
  text_content TEXT,
  parsed_json JSONB,
  ats_score INTEGER,
  ats_feedback JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resume Versions
CREATE TABLE resume_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  sections_json JSONB NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LinkedIn Snapshots
CREATE TABLE linkedin_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  profile_url TEXT,
  raw_text TEXT,
  parsed_json JSONB,
  critique_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills Taxonomy
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profile Skills
CREATE TABLE profile_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  level INTEGER CHECK (level >= 0 AND level <= 5),
  evidence_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, skill_id)
);

-- Job Targets
CREATE TABLE job_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE NOT NULL,
  role_name TEXT NOT NULL,
  seniority seniority_level,
  keywords TEXT[] DEFAULT '{}',
  must_have_skills TEXT[] DEFAULT '{}',
  nice_to_have_skills TEXT[] DEFAULT '{}',
  geo TEXT[] DEFAULT '{}',
  remote_ok BOOLEAN DEFAULT true,
  salary_target INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill Gaps
CREATE TABLE skill_gaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE NOT NULL,
  job_target_id UUID REFERENCES job_targets(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  gap_score DECIMAL(3,2),
  rationale TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  tags TEXT[] DEFAULT '{}',
  estimated_hours INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendations
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  provider TEXT,
  url TEXT,
  reason TEXT,
  priority INTEGER DEFAULT 5,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Postings
CREATE TABLE job_postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT,
  source TEXT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  remote BOOLEAN DEFAULT false,
  description TEXT,
  seniority seniority_level,
  url TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  skills_extracted TEXT[] DEFAULT '{}',
  posted_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Matches
CREATE TABLE job_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE NOT NULL,
  job_posting_id UUID REFERENCES job_postings(id) ON DELETE CASCADE NOT NULL,
  match_score DECIMAL(3,2),
  reasons TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, job_posting_id)
);

-- Job Applications
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE NOT NULL,
  job_posting_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  status application_status DEFAULT 'planned',
  notes TEXT,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tokens INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Tasks
CREATE TABLE agent_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type task_type NOT NULL,
  input_json JSONB,
  output_json JSONB,
  status task_status DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  channel notification_channel DEFAULT 'in_app',
  payload_json JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  meta_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Embeddings
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('job', 'resume', 'profile', 'kb')),
  owner_id UUID NOT NULL,
  vector vector(1536),
  dims INTEGER DEFAULT 1536,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_org ON profiles(org_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_org ON user_roles(org_id);
CREATE INDEX idx_candidate_profiles_org ON candidate_profiles(org_id);
CREATE INDEX idx_candidate_profiles_user ON candidate_profiles(user_id);
CREATE INDEX idx_resumes_org ON resumes(org_id);
CREATE INDEX idx_resumes_user ON resumes(user_id);
CREATE INDEX idx_resumes_profile ON resumes(profile_id);
CREATE INDEX idx_job_postings_org ON job_postings(org_id);
CREATE INDEX idx_job_matches_profile ON job_matches(profile_id);
CREATE INDEX idx_job_applications_profile ON job_applications(profile_id);
CREATE INDEX idx_conversations_org ON conversations(org_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_embeddings_owner ON embeddings(owner_type, owner_id);

-- Security Definer Functions
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role, _org_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_org_id IS NULL OR org_id = _org_id)
  )
$$;

CREATE OR REPLACE FUNCTION get_user_org(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Organizations
CREATE POLICY "Users can view their org"
  ON organizations FOR SELECT
  USING (id = get_user_org(auth.uid()));

CREATE POLICY "Org admins can update their org"
  ON organizations FOR UPDATE
  USING (has_role(auth.uid(), 'org_admin', id));

-- RLS Policies for Profiles
CREATE POLICY "Users can view profiles in their org"
  ON profiles FOR SELECT
  USING (org_id = get_user_org(auth.uid()) OR id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- RLS Policies for User Roles
CREATE POLICY "Users can view roles in their org"
  ON user_roles FOR SELECT
  USING (org_id = get_user_org(auth.uid()));

CREATE POLICY "Org admins can manage roles"
  ON user_roles FOR ALL
  USING (has_role(auth.uid(), 'org_admin', org_id));

-- RLS Policies for Candidate Profiles
CREATE POLICY "Users can view profiles in their org"
  ON candidate_profiles FOR SELECT
  USING (org_id = get_user_org(auth.uid()));

CREATE POLICY "Candidates can manage their own profile"
  ON candidate_profiles FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for Resumes
CREATE POLICY "Users can view resumes in their org"
  ON resumes FOR SELECT
  USING (org_id = get_user_org(auth.uid()));

CREATE POLICY "Users can manage their own resumes"
  ON resumes FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for Job Postings
CREATE POLICY "Users can view jobs in their org"
  ON job_postings FOR SELECT
  USING (org_id = get_user_org(auth.uid()));

CREATE POLICY "Admins can manage jobs"
  ON job_postings FOR ALL
  USING (has_role(auth.uid(), 'org_admin', org_id) OR has_role(auth.uid(), 'platform_admin'));

-- RLS Policies for Job Applications
CREATE POLICY "Users can view their applications"
  ON job_applications FOR SELECT
  USING (profile_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their applications"
  ON job_applications FOR ALL
  USING (profile_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));

-- RLS Policies for Conversations
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their conversations"
  ON conversations FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for Messages
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid()));

-- RLS Policies for other tables (similar pattern)
CREATE POLICY "Users access own data" ON resume_versions FOR ALL
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

CREATE POLICY "Users access own data" ON linkedin_snapshots FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Skills are publicly readable" ON skills FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users access own skills" ON profile_skills FOR ALL
  USING (profile_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users access own targets" ON job_targets FOR ALL
  USING (profile_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users access own gaps" ON skill_gaps FOR ALL
  USING (profile_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Courses are publicly readable" ON courses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users access own recommendations" ON recommendations FOR ALL
  USING (profile_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users access own matches" ON job_matches FOR ALL
  USING (profile_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users access own tasks" ON agent_tasks FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users access own notifications" ON notifications FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admins access audit logs" ON audit_logs FOR SELECT
  USING (has_role(auth.uid(), 'org_admin', org_id) OR has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Users access own embeddings" ON embeddings FOR ALL
  USING (org_id = get_user_org(auth.uid()));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_profiles_updated_at BEFORE UPDATE ON candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_postings_updated_at BEFORE UPDATE ON job_postings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed some basic skills
INSERT INTO skills (name, category) VALUES
  ('JavaScript', 'Programming'),
  ('TypeScript', 'Programming'),
  ('Python', 'Programming'),
  ('React', 'Framework'),
  ('Node.js', 'Framework'),
  ('SQL', 'Database'),
  ('Project Management', 'Soft Skills'),
  ('Communication', 'Soft Skills'),
  ('Leadership', 'Soft Skills'),
  ('Data Analysis', 'Analytics'),
  ('Machine Learning', 'AI/ML'),
  ('Cloud Computing', 'Infrastructure'),
  ('Docker', 'DevOps'),
  ('AWS', 'Cloud Platform'),
  ('Product Strategy', 'Product');

-- Seed some courses
INSERT INTO courses (provider, title, url, tags, estimated_hours) VALUES
  ('Coursera', 'Full Stack Web Development', 'https://coursera.org/learn/fullstack', ARRAY['web', 'react', 'node'], 40),
  ('Udemy', 'Advanced React Patterns', 'https://udemy.com/react-advanced', ARRAY['react', 'javascript'], 20),
  ('LinkedIn Learning', 'Leadership Essentials', 'https://linkedin.com/learning/leadership', ARRAY['leadership', 'management'], 6),
  ('Coursera', 'Machine Learning Specialization', 'https://coursera.org/ml', ARRAY['ml', 'python'], 60),
  ('Udemy', 'AWS Certified Solutions Architect', 'https://udemy.com/aws', ARRAY['cloud', 'aws'], 30);