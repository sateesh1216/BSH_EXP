-- Create storage bucket for expense attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-attachments',
  'expense-attachments',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf']
);

-- Add attachment_url column to expenses table
ALTER TABLE public.expenses
ADD COLUMN attachment_url TEXT;

-- Create RLS policies for expense-attachments bucket
CREATE POLICY "Users can view their own expense attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'expense-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own expense attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'expense-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own expense attachments"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'expense-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own expense attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'expense-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);