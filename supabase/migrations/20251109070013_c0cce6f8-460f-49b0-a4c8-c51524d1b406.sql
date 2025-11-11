-- Create invitation audit log table
CREATE TABLE IF NOT EXISTS public.invitation_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id UUID NOT NULL REFERENCES public.company_invitations(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'resent', 'revoked', 'accepted', 'expired', 'role_changed'
  performed_by UUID REFERENCES auth.users(id),
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitation_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Org admins can view audit logs for their organization
CREATE POLICY "Org admins can view invitation audit logs"
ON public.invitation_audit_log
FOR SELECT
USING (
  invitation_id IN (
    SELECT ci.id 
    FROM company_invitations ci
    INNER JOIN user_roles ur ON ur.org_id = ci.org_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('org_admin', 'platform_admin', 'agency_admin')
  )
);

-- Policy: System can insert audit logs
CREATE POLICY "System can insert invitation audit logs"
ON public.invitation_audit_log
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_invitation_audit_log_invitation_id ON public.invitation_audit_log(invitation_id);
CREATE INDEX idx_invitation_audit_log_created_at ON public.invitation_audit_log(created_at DESC);

-- Function to log invitation changes
CREATE OR REPLACE FUNCTION log_invitation_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO invitation_audit_log (invitation_id, action, performed_by, new_values)
    VALUES (NEW.id, 'created', NEW.invited_by, to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Log acceptance
    IF (OLD.accepted_at IS NULL AND NEW.accepted_at IS NOT NULL) THEN
      INSERT INTO invitation_audit_log (invitation_id, action, performed_by, old_values, new_values)
      VALUES (NEW.id, 'accepted', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    -- Log role changes
    IF (OLD.role != NEW.role) THEN
      INSERT INTO invitation_audit_log (invitation_id, action, performed_by, old_values, new_values)
      VALUES (NEW.id, 'role_changed', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO invitation_audit_log (invitation_id, action, performed_by, old_values)
    VALUES (OLD.id, 'revoked', auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic audit logging
CREATE TRIGGER invitation_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.company_invitations
FOR EACH ROW
EXECUTE FUNCTION log_invitation_change();