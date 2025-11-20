-- Create income table
CREATE TABLE public.income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  expense_details TEXT NOT NULL,
  date DATE NOT NULL,
  payment_mode TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  attachment_url TEXT,
  warranty_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create savings table
CREATE TABLE public.savings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  details TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for income table
CREATE POLICY "Users can view their own income"
  ON public.income
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own income"
  ON public.income
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income"
  ON public.income
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income"
  ON public.income
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for expenses table
CREATE POLICY "Users can view their own expenses"
  ON public.expenses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expenses"
  ON public.expenses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON public.expenses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON public.expenses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for savings table
CREATE POLICY "Users can view their own savings"
  ON public.savings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own savings"
  ON public.savings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings"
  ON public.savings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings"
  ON public.savings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_income_user_id ON public.income(user_id);
CREATE INDEX idx_income_date ON public.income(date);
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_savings_user_id ON public.savings(user_id);
CREATE INDEX idx_savings_date ON public.savings(date);