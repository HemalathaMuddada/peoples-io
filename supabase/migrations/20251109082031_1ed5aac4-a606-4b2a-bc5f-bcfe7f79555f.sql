-- Create triggers to log role changes to audit_logs table

-- Function to log role insertions
CREATE OR REPLACE FUNCTION public.log_role_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    org_id,
    action,
    target_type,
    target_id,
    meta_json
  )
  VALUES (
    auth.uid(),
    NEW.org_id,
    'role_assigned',
    'user_role',
    NEW.id,
    jsonb_build_object(
      'target_user_id', NEW.user_id,
      'role', NEW.role,
      'org_id', NEW.org_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log role updates
CREATE OR REPLACE FUNCTION public.log_role_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    org_id,
    action,
    target_type,
    target_id,
    meta_json
  )
  VALUES (
    auth.uid(),
    NEW.org_id,
    'role_updated',
    'user_role',
    NEW.id,
    jsonb_build_object(
      'target_user_id', NEW.user_id,
      'old_role', OLD.role,
      'new_role', NEW.role,
      'old_org_id', OLD.org_id,
      'new_org_id', NEW.org_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log role deletions
CREATE OR REPLACE FUNCTION public.log_role_delete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    org_id,
    action,
    target_type,
    target_id,
    meta_json
  )
  VALUES (
    auth.uid(),
    OLD.org_id,
    'role_removed',
    'user_role',
    OLD.id,
    jsonb_build_object(
      'target_user_id', OLD.user_id,
      'role', OLD.role,
      'org_id', OLD.org_id
    )
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for user_roles table
DROP TRIGGER IF EXISTS trigger_log_role_insert ON public.user_roles;
CREATE TRIGGER trigger_log_role_insert
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_insert();

DROP TRIGGER IF EXISTS trigger_log_role_update ON public.user_roles;
CREATE TRIGGER trigger_log_role_update
  AFTER UPDATE ON public.user_roles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role OR OLD.org_id IS DISTINCT FROM NEW.org_id)
  EXECUTE FUNCTION public.log_role_update();

DROP TRIGGER IF EXISTS trigger_log_role_delete ON public.user_roles;
CREATE TRIGGER trigger_log_role_delete
  AFTER DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_delete();