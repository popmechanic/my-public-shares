-- Fix RLS policies to allow trading operations
-- Issue: Users cannot update available_shares of other users during trades

-- Drop the existing restrictive update policy for profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate the policy for users updating their own profiles
CREATE POLICY "Users can update their own profile" ON public.profiles 
FOR UPDATE USING (auth.uid() = user_id);

-- Add new policy to allow updating available_shares during trading
-- This allows any authenticated user to update available_shares of tradeable users
CREATE POLICY "Allow trading updates to available shares" ON public.profiles 
FOR UPDATE USING (
  is_tradeable = true
);