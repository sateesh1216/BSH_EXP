-- Create access_requests table for user registration requests
CREATE TABLE public.access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  rejection_reason TEXT
);

-- Enable RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a request (public signup)
CREATE POLICY "Anyone can submit access request"
ON public.access_requests
FOR INSERT
WITH CHECK (true);

-- Admins can view all requests
CREATE POLICY "Admins can view all access requests"
ON public.access_requests
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update access requests"
ON public.access_requests
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Admins can delete requests
CREATE POLICY "Admins can delete access requests"
ON public.access_requests
FOR DELETE
USING (public.is_admin(auth.uid()));