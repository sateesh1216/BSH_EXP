-- Fix Role-Based Access Control Vulnerability
-- Drop existing potentially vulnerable policies on user_roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create secure RLS policies for user_roles table
-- Only allow admins to manage roles (INSERT, UPDATE, DELETE)
CREATE POLICY "Only admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow users to view their own roles and admins to view all roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Create audit log table for tracking sensitive operations
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), 'INSERT', 'user_roles', NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), 'UPDATE', 'user_roles', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (auth.uid(), 'DELETE', 'user_roles', OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for role change auditing
CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_changes();

-- Enhance existing tables with better constraints
-- Add rate limiting table for auth attempts
CREATE TABLE public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  email text,
  attempt_count integer DEFAULT 1,
  last_attempt timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate limits (only system should access)
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Add indexes for performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_auth_rate_limits_ip ON public.auth_rate_limits(ip_address);
CREATE INDEX idx_auth_rate_limits_email ON public.auth_rate_limits(email);

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(
  _ip_address inet,
  _email text DEFAULT NULL,
  _max_attempts integer DEFAULT 5,
  _window_minutes integer DEFAULT 15
)
RETURNS boolean AS $$
DECLARE
  attempt_count integer;
  is_blocked boolean := false;
BEGIN
  -- Check if IP is currently blocked
  SELECT blocked_until > now() INTO is_blocked
  FROM public.auth_rate_limits
  WHERE ip_address = _ip_address
    AND (email = _email OR email IS NULL)
  ORDER BY last_attempt DESC
  LIMIT 1;
  
  IF is_blocked THEN
    RETURN false;
  END IF;
  
  -- Count recent attempts
  SELECT COUNT(*) INTO attempt_count
  FROM public.auth_rate_limits
  WHERE ip_address = _ip_address
    AND (email = _email OR email IS NULL)
    AND last_attempt > now() - (_window_minutes || ' minutes')::interval;
  
  -- If too many attempts, block the IP
  IF attempt_count >= _max_attempts THEN
    INSERT INTO public.auth_rate_limits (ip_address, email, attempt_count, blocked_until)
    VALUES (_ip_address, _email, attempt_count + 1, now() + '1 hour'::interval)
    ON CONFLICT (ip_address) DO UPDATE SET
      attempt_count = auth_rate_limits.attempt_count + 1,
      blocked_until = now() + '1 hour'::interval,
      last_attempt = now();
    RETURN false;
  END IF;
  
  -- Record the attempt
  INSERT INTO public.auth_rate_limits (ip_address, email, attempt_count)
  VALUES (_ip_address, _email, 1)
  ON CONFLICT (ip_address) DO UPDATE SET
    attempt_count = auth_rate_limits.attempt_count + 1,
    last_attempt = now();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;