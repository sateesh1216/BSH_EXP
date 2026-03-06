
CREATE TABLE public.hand_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  borrower_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL DEFAULT 0,
  interest_type TEXT NOT NULL DEFAULT 'simple',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hand_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hand loans" ON public.hand_loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own hand loans" ON public.hand_loans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own hand loans" ON public.hand_loans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own hand loans" ON public.hand_loans FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all hand loans" ON public.hand_loans FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update all hand loans" ON public.hand_loans FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete all hand loans" ON public.hand_loans FOR DELETE USING (is_admin(auth.uid()));
