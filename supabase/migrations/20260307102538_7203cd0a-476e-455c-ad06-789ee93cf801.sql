
CREATE TABLE public.loan_repayments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.hand_loans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own repayments" ON public.loan_repayments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own repayments" ON public.loan_repayments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own repayments" ON public.loan_repayments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own repayments" ON public.loan_repayments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all repayments" ON public.loan_repayments FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete all repayments" ON public.loan_repayments FOR DELETE USING (is_admin(auth.uid()));

CREATE INDEX idx_loan_repayments_loan_id ON public.loan_repayments(loan_id);
CREATE INDEX idx_loan_repayments_user_id ON public.loan_repayments(user_id);
