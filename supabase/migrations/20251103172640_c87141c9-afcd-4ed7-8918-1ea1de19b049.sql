-- Add warranty_url column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN warranty_url text;