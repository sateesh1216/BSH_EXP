-- Create function to delete login history older than 1 day
CREATE OR REPLACE FUNCTION public.cleanup_old_login_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.login_history
  WHERE login_at < now() - interval '1 day';
END;
$$;

-- Create a function that can be called via RPC to cleanup old records
-- This will be called automatically when admin views login history
CREATE OR REPLACE FUNCTION public.auto_cleanup_login_history()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.login_history
  WHERE login_at < now() - interval '1 day';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Create RLS policy for admin to delete login history manually
CREATE POLICY "Admins can delete login history"
ON public.login_history
FOR DELETE
USING (public.is_admin(auth.uid()));