-- Fix: Add SELECT policy for profiles so users can view their own profiles
-- The previous migration accidentally left profiles with no SELECT policies

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Note: The profiles_directory view allows limited viewing of other users' profiles
-- (avatar_url only, no PII) through the underlying RLS of the profiles table