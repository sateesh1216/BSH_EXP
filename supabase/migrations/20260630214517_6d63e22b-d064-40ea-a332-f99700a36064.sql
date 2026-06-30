
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.has_role(_user_id, 'admin')
$$;

REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated, anon, service_role;

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete login history" ON public.login_history;
DROP POLICY IF EXISTS "Admins can view all login history" ON public.login_history;
CREATE POLICY "Admins can delete login history" ON public.login_history FOR DELETE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can view all login history" ON public.login_history FOR SELECT USING (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can insert all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can update all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can view all expenses" ON public.expenses;
CREATE POLICY "Admins can delete all expenses" ON public.expenses FOR DELETE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can insert all expenses" ON public.expenses FOR INSERT WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "Admins can update all expenses" ON public.expenses FOR UPDATE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can view all expenses" ON public.expenses FOR SELECT USING (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete all savings" ON public.savings;
DROP POLICY IF EXISTS "Admins can insert all savings" ON public.savings;
DROP POLICY IF EXISTS "Admins can update all savings" ON public.savings;
DROP POLICY IF EXISTS "Admins can view all savings" ON public.savings;
CREATE POLICY "Admins can delete all savings" ON public.savings FOR DELETE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can insert all savings" ON public.savings FOR INSERT WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "Admins can update all savings" ON public.savings FOR UPDATE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can view all savings" ON public.savings FOR SELECT USING (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete access requests" ON public.access_requests;
DROP POLICY IF EXISTS "Admins can update access requests" ON public.access_requests;
DROP POLICY IF EXISTS "Admins can view all access requests" ON public.access_requests;
DROP POLICY IF EXISTS "Anyone can submit access request" ON public.access_requests;
CREATE POLICY "Admins can delete access requests" ON public.access_requests FOR DELETE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can update access requests" ON public.access_requests FOR UPDATE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can view all access requests" ON public.access_requests FOR SELECT USING (private.is_admin(auth.uid()));
CREATE POLICY "Anyone can submit access request" ON public.access_requests
  FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND char_length(email) BETWEEN 3 AND 320
    AND char_length(phone_number) BETWEEN 5 AND 32
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

DROP POLICY IF EXISTS "Admins can delete all income" ON public.income;
DROP POLICY IF EXISTS "Admins can insert all income" ON public.income;
DROP POLICY IF EXISTS "Admins can update all income" ON public.income;
DROP POLICY IF EXISTS "Admins can view all income" ON public.income;
CREATE POLICY "Admins can delete all income" ON public.income FOR DELETE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can insert all income" ON public.income FOR INSERT WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "Admins can update all income" ON public.income FOR UPDATE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can view all income" ON public.income FOR SELECT USING (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete all repayments" ON public.loan_repayments;
DROP POLICY IF EXISTS "Admins can view all repayments" ON public.loan_repayments;
DROP POLICY IF EXISTS "Admins can insert all repayments" ON public.loan_repayments;
DROP POLICY IF EXISTS "Admins can update all repayments" ON public.loan_repayments;
CREATE POLICY "Admins can delete all repayments" ON public.loan_repayments FOR DELETE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can view all repayments" ON public.loan_repayments FOR SELECT USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can insert all repayments" ON public.loan_repayments FOR INSERT WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "Admins can update all repayments" ON public.loan_repayments FOR UPDATE USING (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete all hand loans" ON public.hand_loans;
DROP POLICY IF EXISTS "Admins can update all hand loans" ON public.hand_loans;
DROP POLICY IF EXISTS "Admins can view all hand loans" ON public.hand_loans;
CREATE POLICY "Admins can delete all hand loans" ON public.hand_loans FOR DELETE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can update all hand loans" ON public.hand_loans FOR UPDATE USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins can view all hand loans" ON public.hand_loans FOR SELECT USING (private.is_admin(auth.uid()));

DROP FUNCTION IF EXISTS public.is_admin(uuid);
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

ALTER TABLE public.profiles DROP COLUMN IF EXISTS temp_password;

DROP POLICY IF EXISTS "Public can view expense attachments" ON storage.objects;
