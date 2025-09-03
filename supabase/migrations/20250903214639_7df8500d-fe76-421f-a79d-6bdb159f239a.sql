-- Fix RLS policy for auth_rate_limits table
-- This table should only be accessible by the system/functions, not users directly
CREATE POLICY "System only access to rate limits" 
ON public.auth_rate_limits 
FOR ALL 
TO authenticated
USING (false)
WITH CHECK (false);

-- Allow service role to manage rate limits (for system functions)
CREATE POLICY "Service role can manage rate limits" 
ON public.auth_rate_limits 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);