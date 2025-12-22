-- Drop and recreate the SELECT policies on user_roles as PERMISSIVE
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
TO public
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);