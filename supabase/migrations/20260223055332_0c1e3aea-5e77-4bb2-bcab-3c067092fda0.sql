
-- Add start_date and end_date to recurring_reminders for date range reminders
ALTER TABLE public.recurring_reminders
ADD COLUMN start_date date,
ADD COLUMN end_date date;

-- Update type check to allow Expense and Savings alongside EMI/SIP
ALTER TABLE public.recurring_reminders
DROP CONSTRAINT IF EXISTS recurring_reminders_type_check;
