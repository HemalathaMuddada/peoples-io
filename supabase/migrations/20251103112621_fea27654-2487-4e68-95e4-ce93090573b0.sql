-- Allow users to assign themselves the mentor role during signup
CREATE POLICY "Users can assign themselves mentor role during signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'mentor'
);