-- Make the expense-attachments bucket public so users can view their uploaded bills and warranties
UPDATE storage.buckets
SET public = true
WHERE id = 'expense-attachments';