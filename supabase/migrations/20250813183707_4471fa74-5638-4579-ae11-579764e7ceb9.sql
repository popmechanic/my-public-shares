-- Strengthen financial data security with additional safeguards
-- Drop existing policies to recreate with stronger security
DROP POLICY IF EXISTS "Users can view their own account" ON public.user_accounts;
DROP POLICY IF EXISTS "Users can update their own account" ON public.user_accounts;
DROP POLICY IF EXISTS "Users can insert their own account" ON public.user_accounts;

-- Create ultra-secure policies for financial data
-- 1. SELECT: Only account owners can view their financial data
CREATE POLICY "Account owners only can view financial data" ON public.user_accounts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND auth.role() = 'authenticated'
);

-- 2. UPDATE: Only account owners can update their financial data
CREATE POLICY "Account owners only can update financial data" ON public.user_accounts
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  auth.uid() = user_id
);

-- 3. INSERT: Only authenticated users can create their own account
CREATE POLICY "Authenticated users can create own account only" ON public.user_accounts
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND auth.role() = 'authenticated'
);

-- 4. Explicitly deny DELETE operations (financial records should be preserved)
-- No DELETE policy = no one can delete financial records