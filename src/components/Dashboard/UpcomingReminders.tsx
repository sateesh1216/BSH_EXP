import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bell, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Reminder {
  type: 'EMI' | 'SIP';
  detail: string;
  dayOfMonth: number;
  daysUntil: number;
}

const UpcomingReminders = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Find most recent EMI expenses to detect recurring day-of-month
  const { data: emiReminders } = useQuery({
    queryKey: ['emi-reminders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('expense_details, date')
        .eq('user_id', user?.id)
        .ilike('expense_details', '%emi%')
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Find most recent SIP savings to detect recurring day-of-month
  const { data: sipReminders } = useQuery({
    queryKey: ['sip-reminders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings')
        .select('details, date')
        .eq('user_id', user?.id)
        .ilike('details', '%sip%')
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const getUpcomingReminders = (): Reminder[] => {
    const reminders: Reminder[] = [];
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Extract unique EMI entries by detail+day
    const emiMap = new Map<string, number>();
    emiReminders?.forEach((e) => {
      const day = new Date(e.date).getDate();
      const key = `${e.expense_details.toLowerCase().trim()}-${day}`;
      if (!emiMap.has(key)) {
        emiMap.set(key, day);
        // Check if this day is within next 3 days
        const dueDate = new Date(currentYear, currentMonth, day);
        // If due date already passed this month, check next month
        if (dueDate < today) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 3) {
          reminders.push({
            type: 'EMI',
            detail: e.expense_details,
            dayOfMonth: day,
            daysUntil: diffDays,
          });
        }
      }
    });

    // Extract unique SIP entries by detail+day
    const sipMap = new Map<string, number>();
    sipReminders?.forEach((s) => {
      const day = new Date(s.date).getDate();
      const key = `${s.details.toLowerCase().trim()}-${day}`;
      if (!sipMap.has(key)) {
        sipMap.set(key, day);
        const dueDate = new Date(currentYear, currentMonth, day);
        if (dueDate < today) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 3) {
          reminders.push({
            type: 'SIP',
            detail: s.details,
            dayOfMonth: day,
            daysUntil: diffDays,
          });
        }
      }
    });

    return reminders.filter((r) => !dismissed.includes(`${r.type}-${r.detail}-${r.dayOfMonth}`));
  };

  const reminders = getUpcomingReminders();

  if (reminders.length === 0) return null;

  return (
    <div className="space-y-2">
      {reminders.map((reminder) => {
        const key = `${reminder.type}-${reminder.detail}-${reminder.dayOfMonth}`;
        const dayLabel =
          reminder.daysUntil === 0
            ? 'Today'
            : reminder.daysUntil === 1
            ? 'Tomorrow'
            : `In ${reminder.daysUntil} days`;

        return (
          <Alert
            key={key}
            className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 relative"
          >
            <Bell className="h-4 w-4 !text-yellow-600" />
            <AlertTitle className="font-semibold">
              {reminder.type} Payment Reminder — {dayLabel} (
              {reminder.dayOfMonth}th of every month)
            </AlertTitle>
            <AlertDescription>
              Your <strong>{reminder.type}</strong> for "
              <strong>{reminder.detail}</strong>" is due{' '}
              {dayLabel.toLowerCase()}. Please ensure sufficient balance.
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 text-yellow-600 hover:text-yellow-800"
              onClick={() => setDismissed((prev) => [...prev, key])}
            >
              <X className="h-3 w-3" />
            </Button>
          </Alert>
        );
      })}
    </div>
  );
};

export default UpcomingReminders;
