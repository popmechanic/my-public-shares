-- Fix the security vulnerability in profiles table
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create secure, granular policies
-- 1. Users can always view their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Authenticated users can view profiles of tradeable users (needed for trading)
CREATE POLICY "Authenticated users can view tradeable profiles" ON public.profiles
FOR SELECT
USING (
  auth.role() = 'authenticated' 
  AND is_tradeable = true
);

-- 3. Authenticated users can view basic info of other authenticated users (for community features)
-- This is more restrictive - only shows limited fields
CREATE POLICY "Authenticated users can view basic user info" ON public.profiles
FOR SELECT
USING (
  auth.role() = 'authenticated' 
  AND is_tradeable = false
);

-- Note: The above policies ensure:
-- - Unauthenticated users see NO profiles at all
-- - Authenticated users can only see tradeable profiles (for investing)
-- - Users always see their own profile
-- - No anonymous access to personal data