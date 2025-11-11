-- Create referrals table to track who referred whom
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending',
  UNIQUE(referrer_id, referred_id)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (both given and received)
CREATE POLICY "Users can view their referrals"
  ON public.referrals
  FOR SELECT
  USING (
    auth.uid() = referrer_id OR auth.uid() = referred_id
  );

-- System can insert referrals
CREATE POLICY "Anyone can create referrals"
  ON public.referrals
  FOR INSERT
  WITH CHECK (auth.uid() = referred_id);

-- Add index for better performance
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_id);