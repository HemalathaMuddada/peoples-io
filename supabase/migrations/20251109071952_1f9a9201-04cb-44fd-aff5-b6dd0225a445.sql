-- Create team role enum
CREATE TYPE public.team_role AS ENUM ('team_owner', 'team_admin', 'team_member');

-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'team_member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  invited_by UUID REFERENCES auth.users(id),
  UNIQUE(team_id, user_id)
);

-- Create team invitations table
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'team_member',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check team role
CREATE OR REPLACE FUNCTION public.has_team_role(_user_id UUID, _team_id UUID, _role team_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
      AND team_id = _team_id
      AND role = _role
  )
$$;

-- Function to check if user is team member (any role)
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
      AND team_id = _team_id
  )
$$;

-- Function to get user's role in team
CREATE OR REPLACE FUNCTION public.get_team_role(_user_id UUID, _team_id UUID)
RETURNS team_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.team_members
  WHERE user_id = _user_id
    AND team_id = _team_id
  LIMIT 1
$$;

-- RLS Policies for teams
CREATE POLICY "Users can view teams in their org"
ON public.teams
FOR SELECT
USING (
  org_id IN (
    SELECT ur.org_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
);

CREATE POLICY "Org admins can create teams"
ON public.teams
FOR INSERT
WITH CHECK (
  org_id IN (
    SELECT ur.org_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('org_admin', 'platform_admin')
  )
);

CREATE POLICY "Team owners can update teams"
ON public.teams
FOR UPDATE
USING (
  has_team_role(auth.uid(), id, 'team_owner') OR
  has_team_role(auth.uid(), id, 'team_admin') OR
  has_role(auth.uid(), 'platform_admin')
);

CREATE POLICY "Team owners can delete teams"
ON public.teams
FOR DELETE
USING (
  has_team_role(auth.uid(), id, 'team_owner') OR
  has_role(auth.uid(), 'platform_admin')
);

-- RLS Policies for team_members
CREATE POLICY "Users can view team members of their teams"
ON public.team_members
FOR SELECT
USING (
  is_team_member(auth.uid(), team_id)
);

CREATE POLICY "Team admins can add members"
ON public.team_members
FOR INSERT
WITH CHECK (
  has_team_role(auth.uid(), team_id, 'team_owner') OR
  has_team_role(auth.uid(), team_id, 'team_admin') OR
  has_role(auth.uid(), 'platform_admin')
);

CREATE POLICY "Team admins can update members"
ON public.team_members
FOR UPDATE
USING (
  has_team_role(auth.uid(), team_id, 'team_owner') OR
  has_team_role(auth.uid(), team_id, 'team_admin') OR
  has_role(auth.uid(), 'platform_admin')
);

CREATE POLICY "Team admins can remove members"
ON public.team_members
FOR DELETE
USING (
  has_team_role(auth.uid(), team_id, 'team_owner') OR
  has_team_role(auth.uid(), team_id, 'team_admin') OR
  user_id = auth.uid() OR
  has_role(auth.uid(), 'platform_admin')
);

-- RLS Policies for team_invitations
CREATE POLICY "Team members can view team invitations"
ON public.team_invitations
FOR SELECT
USING (
  is_team_member(auth.uid(), team_id) OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Team admins can create invitations"
ON public.team_invitations
FOR INSERT
WITH CHECK (
  has_team_role(auth.uid(), team_id, 'team_owner') OR
  has_team_role(auth.uid(), team_id, 'team_admin') OR
  has_role(auth.uid(), 'platform_admin')
);

CREATE POLICY "Team admins can delete invitations"
ON public.team_invitations
FOR DELETE
USING (
  has_team_role(auth.uid(), team_id, 'team_owner') OR
  has_team_role(auth.uid(), team_id, 'team_admin') OR
  has_role(auth.uid(), 'platform_admin')
);

-- Create indexes
CREATE INDEX idx_teams_org_id ON public.teams(org_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);

-- Trigger for updated_at
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();