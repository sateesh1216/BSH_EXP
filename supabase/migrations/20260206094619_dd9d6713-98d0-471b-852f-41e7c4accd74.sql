-- Create storage bucket for expense attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-attachments', 'expense-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload their own attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'expense-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own attachments
CREATE POLICY "Users can view their own attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'expense-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own attachments
CREATE POLICY "Users can update their own attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'expense-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'expense-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to view attachments (since bucket is public)
CREATE POLICY "Public can view expense attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'expense-attachments');