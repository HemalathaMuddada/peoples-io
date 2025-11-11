-- Create role change requests table for approval workflow
CREATE TABLE IF NOT EXISTS public.role_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('assign', 'update', 'remove')),
  previous_role TEXT,
  new_role app_role,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  justification TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days')
);

-- Enable RLS
ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all requests in their scope
CREATE POLICY "Admins can view role change requests"
ON public.role_change_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'platform_admin'::app_role) OR
  (has_role(auth.uid(), 'org_admin'::app_role, org_id) AND org_id IS NOT NULL)
);

-- Policy: Admins can create requests
CREATE POLICY "Admins can create role change requests"
ON public.role_change_requests
FOR INSERT
WITH CHECK (
  auth.uid() = requested_by AND
  (has_role(auth.uid(), 'platform_admin'::app_role) OR
   (has_role(auth.uid(), 'org_admin'::app_role, org_id) AND org_id IS NOT NULL))
);

-- Policy: Admins can approve/reject requests (but not their own)
CREATE POLICY "Admins can update role change requests"
ON public.role_change_requests
FOR UPDATE
USING (
  auth.uid() != requested_by AND
  status = 'pending' AND
  (has_role(auth.uid(), 'platform_admin'::app_role) OR
   (has_role(auth.uid(), 'org_admin'::app_role, org_id) AND org_id IS NOT NULL))
);

-- Create index for performance
CREATE INDEX idx_role_change_requests_status ON public.role_change_requests(status);
CREATE INDEX idx_role_change_requests_target_user ON public.role_change_requests(target_user_id);
CREATE INDEX idx_role_change_requests_created_at ON public.role_change_requests(created_at DESC);

-- Function to execute approved role change
CREATE OR REPLACE FUNCTION public.execute_role_change_request(request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_result JSONB;
BEGIN
  -- Get the request
  SELECT * INTO v_request
  FROM public.role_change_requests
  WHERE id = request_id AND status = 'approved';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or not approved');
  END IF;
  
  -- Execute based on request type
  IF v_request.request_type = 'assign' THEN
    -- Insert new role
    INSERT INTO public.user_roles (user_id, role, org_id)
    VALUES (v_request.target_user_id, v_request.new_role, v_request.org_id)
    ON CONFLICT (user_id, role, org_id) DO NOTHING;
    
  ELSIF v_request.request_type = 'update' THEN
    -- Update existing role
    UPDATE public.user_roles
    SET role = v_request.new_role
    WHERE user_id = v_request.target_user_id
      AND role = v_request.previous_role::app_role
      AND org_id = v_request.org_id;
      
  ELSIF v_request.request_type = 'remove' THEN
    -- Delete role
    DELETE FROM public.user_roles
    WHERE user_id = v_request.target_user_id
      AND role = v_request.previous_role::app_role
      AND org_id = v_request.org_id;
  END IF;
  
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create trigger to update timestamp
CREATE TRIGGER update_role_change_requests_updated_at
BEFORE UPDATE ON public.role_change_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();