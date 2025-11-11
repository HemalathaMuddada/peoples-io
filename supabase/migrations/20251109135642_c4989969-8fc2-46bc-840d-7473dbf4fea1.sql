-- Allow users to assign themselves the candidate role during signup
CREATE POLICY "Users can assign themselves candidate role during signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'candidate'::app_role
);