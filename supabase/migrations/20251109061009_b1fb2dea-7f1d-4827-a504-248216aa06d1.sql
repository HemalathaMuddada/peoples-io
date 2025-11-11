-- Phase 1b: Add columns and tables using the new enums

-- 1. Add type column to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS type organization_type DEFAULT 'CANDIDATE_ORG';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_website text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url text;

-- 2. Mark all existing organizations as CANDIDATE_ORG
UPDATE organizations SET type = 'CANDIDATE_ORG' WHERE type IS NULL;

-- 3. Add dual job ownership to job_postings
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS employer_org_id uuid REFERENCES organizations(id);

-- For existing jobs, set employer_org_id = org_id (self-posted)
UPDATE job_postings SET employer_org_id = org_id WHERE employer_org_id IS NULL;

-- 4. Create company invitations table
CREATE TABLE IF NOT EXISTS company_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role app_role NOT NULL,
  invited_by uuid REFERENCES auth.users(id),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. Enable RLS on company_invitations
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for company_invitations
DROP POLICY IF EXISTS "Org admins can manage invitations" ON company_invitations;
CREATE POLICY "Org admins can manage invitations"
ON company_invitations
FOR ALL
USING (
  org_id IN (
    SELECT ur.org_id FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('org_admin', 'platform_admin', 'agency_admin')
  )
)
WITH CHECK (
  org_id IN (
    SELECT ur.org_id FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('org_admin', 'platform_admin', 'agency_admin')
  )
);

DROP POLICY IF EXISTS "Users can view their own invitations by email" ON company_invitations;
CREATE POLICY "Users can view their own invitations by email"
ON company_invitations
FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR auth.uid() = invited_by
);

-- 7. Update job_postings RLS to handle dual ownership
DROP POLICY IF EXISTS "Org members can view their jobs" ON job_postings;
DROP POLICY IF EXISTS "Org admins can manage jobs" ON job_postings;
DROP POLICY IF EXISTS "Users can view jobs from their org or employer org" ON job_postings;
DROP POLICY IF EXISTS "Org admins and recruiters can create jobs" ON job_postings;
DROP POLICY IF EXISTS "Posting org can update their jobs" ON job_postings;
DROP POLICY IF EXISTS "Posting org can delete their jobs" ON job_postings;

CREATE POLICY "Users can view jobs from their org or employer org"
ON job_postings
FOR SELECT
USING (
  org_id = get_user_org(auth.uid())
  OR employer_org_id = get_user_org(auth.uid())
  OR has_role(auth.uid(), 'platform_admin')
);

CREATE POLICY "Org admins and recruiters can create jobs"
ON job_postings
FOR INSERT
WITH CHECK (
  org_id = get_user_org(auth.uid())
  AND (
    has_role(auth.uid(), 'org_admin', org_id)
    OR has_role(auth.uid(), 'agency_admin', org_id)
    OR has_role(auth.uid(), 'recruiter', org_id)
    OR has_role(auth.uid(), 'platform_admin')
  )
);

CREATE POLICY "Posting org can update their jobs"
ON job_postings
FOR UPDATE
USING (
  org_id = get_user_org(auth.uid())
  AND (
    has_role(auth.uid(), 'org_admin', org_id)
    OR has_role(auth.uid(), 'agency_admin', org_id)
    OR has_role(auth.uid(), 'recruiter', org_id)
    OR has_role(auth.uid(), 'hiring_manager', org_id)
    OR has_role(auth.uid(), 'platform_admin')
  )
);

CREATE POLICY "Posting org can delete their jobs"
ON job_postings
FOR DELETE
USING (
  org_id = get_user_org(auth.uid())
  AND (
    has_role(auth.uid(), 'org_admin', org_id)
    OR has_role(auth.uid(), 'agency_admin', org_id)
    OR has_role(auth.uid(), 'platform_admin')
  )
);

-- 8. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_postings_employer_org ON job_postings(employer_org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_company_invitations_token ON company_invitations(token);
CREATE INDEX IF NOT EXISTS idx_company_invitations_email ON company_invitations(email);

-- 9. Create function to accept invitation
CREATE OR REPLACE FUNCTION accept_company_invitation(invitation_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation company_invitations;
  v_user_id uuid;
  v_user_email text;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Get invitation
  SELECT * INTO v_invitation
  FROM company_invitations
  WHERE token = invitation_token
  AND accepted_at IS NULL
  AND expires_at > now();

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Check email matches
  IF v_invitation.email != v_user_email THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email does not match invitation');
  END IF;

  -- Update user's org_id
  UPDATE profiles SET org_id = v_invitation.org_id WHERE id = v_user_id;

  -- Add role to user
  INSERT INTO user_roles (user_id, org_id, role)
  VALUES (v_user_id, v_invitation.org_id, v_invitation.role)
  ON CONFLICT (user_id, org_id, role) DO NOTHING;

  -- Mark invitation as accepted
  UPDATE company_invitations
  SET accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true, 'org_id', v_invitation.org_id);
END;
$$;