-- Create function to resend invitation
CREATE OR REPLACE FUNCTION public.resend_invitation(invitation_id uuid, admin_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invitation company_invitations;
  v_org_name text;
  v_inviter_name text;
  v_invite_link text;
  v_new_token text;
  v_new_expiry timestamptz;
BEGIN
  -- Get invitation and verify admin has access
  SELECT ci.* INTO v_invitation
  FROM company_invitations ci
  WHERE ci.id = invitation_id
    AND ci.accepted_at IS NULL
    AND (
      has_role(admin_user_id, 'platform_admin') OR
      has_role(admin_user_id, 'org_admin', ci.org_id) OR
      has_role(admin_user_id, 'agency_admin', ci.org_id)
    );

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or unauthorized');
  END IF;

  -- Generate new token and expiry
  v_new_token := encode(gen_random_bytes(32), 'hex');
  v_new_expiry := now() + INTERVAL '7 days';

  -- Update invitation
  UPDATE company_invitations
  SET 
    token = v_new_token,
    expires_at = v_new_expiry,
    updated_at = now()
  WHERE id = invitation_id;

  -- Get organization name
  SELECT COALESCE(company_name, name) INTO v_org_name
  FROM organizations
  WHERE id = v_invitation.org_id;

  -- Get inviter name
  SELECT full_name INTO v_inviter_name
  FROM profiles
  WHERE id = admin_user_id;

  -- Generate invite link
  v_invite_link := current_setting('app.base_url', true) || '/accept-invitation?token=' || v_new_token;

  -- Queue email notification
  PERFORM queue_email_notification(
    NULL,
    v_invitation.org_id,
    'company_invitation',
    jsonb_build_object(
      'email', v_invitation.email,
      'organizationName', v_org_name,
      'inviterName', COALESCE(v_inviter_name, 'An admin'),
      'role', v_invitation.role,
      'inviteLink', v_invite_link,
      'expiresAt', to_char(v_new_expiry, 'FMMonth DD, YYYY at HH12:MI AM')
    )
  );

  RETURN jsonb_build_object('success', true, 'message', 'Invitation resent successfully');
END;
$$;