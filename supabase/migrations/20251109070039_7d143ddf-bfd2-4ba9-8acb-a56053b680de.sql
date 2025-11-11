-- Fix search_path for log_invitation_change function
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
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;