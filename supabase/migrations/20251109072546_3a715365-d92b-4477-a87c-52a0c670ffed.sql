-- Create team activity log table
CREATE TABLE IF NOT EXISTS public.team_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_team_activity_log_team_id ON public.team_activity_log(team_id, created_at DESC);
CREATE INDEX idx_team_activity_log_user_id ON public.team_activity_log(user_id);

-- Enable RLS
ALTER TABLE public.team_activity_log ENABLE ROW LEVEL SECURITY;

-- Team members can view their team's activity
CREATE POLICY "Team members can view their team activity"
  ON public.team_activity_log
  FOR SELECT
  USING (is_team_member(auth.uid(), team_id));

-- Team members can insert activity logs
CREATE POLICY "Team members can insert activity logs"
  ON public.team_activity_log
  FOR INSERT
  WITH CHECK (is_team_member(auth.uid(), team_id) AND user_id = auth.uid());

-- Create function to log team member added
CREATE OR REPLACE FUNCTION public.log_team_member_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.team_activity_log (team_id, user_id, action_type, target_user_id, metadata)
  VALUES (
    NEW.team_id,
    auth.uid(),
    'member_added',
    NEW.user_id,
    jsonb_build_object('role', NEW.role)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for team member added
CREATE TRIGGER team_member_added_trigger
AFTER INSERT ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.log_team_member_added();

-- Create function to log team member removed
CREATE OR REPLACE FUNCTION public.log_team_member_removed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.team_activity_log (team_id, user_id, action_type, target_user_id, metadata)
  VALUES (
    OLD.team_id,
    auth.uid(),
    'member_removed',
    OLD.user_id,
    jsonb_build_object('role', OLD.role)
  );
  RETURN OLD;
END;
$$;

-- Create trigger for team member removed
CREATE TRIGGER team_member_removed_trigger
AFTER DELETE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.log_team_member_removed();

-- Create function to log team member role changed
CREATE OR REPLACE FUNCTION public.log_team_member_role_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.role != NEW.role THEN
    INSERT INTO public.team_activity_log (team_id, user_id, action_type, target_user_id, metadata)
    VALUES (
      NEW.team_id,
      auth.uid(),
      'role_changed',
      NEW.user_id,
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for team member role changed
CREATE TRIGGER team_member_role_changed_trigger
AFTER UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.log_team_member_role_changed();

-- Create function to log team invitation sent
CREATE OR REPLACE FUNCTION public.log_team_invitation_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.team_activity_log (team_id, user_id, action_type, metadata)
  VALUES (
    NEW.team_id,
    auth.uid(),
    'invitation_sent',
    jsonb_build_object('email', NEW.email, 'role', NEW.role)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for team invitation sent
CREATE TRIGGER team_invitation_sent_trigger
AFTER INSERT ON public.team_invitations
FOR EACH ROW
EXECUTE FUNCTION public.log_team_invitation_sent();