import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bell, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ManageReminders from './ManageReminders';

interface Reminder {
  type: string;
  detail: string;
  dayOfMonth: number;
  daysUntil: number;
  source: 'auto' | 'manual';
  startDate?: string;
  endDate?: string;
}

const UpcomingReminders = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Manual reminders from DB
  const { data: manualReminders } = useQuery({
    queryKey: ['manual-reminders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_reminders')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Auto-detect EMI from expenses
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

  // Auto-detect SIP from savings
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
    today.setHours(0, 0, 0, 0);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const calcDaysUntil = (day: number) => {
      const dueDate = new Date(currentYear, currentMonth, day);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate < today) dueDate.setMonth(dueDate.getMonth() + 1);
      return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

    // Manual reminders (priority) — check date range
    const manualKeys = new Set<string>();
    manualReminders?.forEach((r) => {
      // Check if today is within the date range (if set)
      if (r.start_date && new Date(r.start_date) > today) return;
      if (r.end_date && new Date(r.end_date) < today) return;

      const diffDays = calcDaysUntil(r.day_of_month);
      const key = `${r.type}-${r.label}-${r.day_of_month}`;
      manualKeys.add(key);
      if (diffDays >= 0 && diffDays <= 3) {
        reminders.push({
          type: r.type,
          detail: r.label,
          dayOfMonth: r.day_of_month,
          daysUntil: diffDays,
          source: 'manual',
          startDate: r.start_date || undefined,
          endDate: r.end_date || undefined,
        });
      }
    });

    // Auto-detected EMI (skip if manual exists for same)
    const emiMap = new Map<string, number>();
    emiReminders?.forEach((e) => {
      const day = new Date(e.date).getDate();
      const mapKey = `${e.expense_details.toLowerCase().trim()}-${day}`;
      const manualCheck = `EMI-${e.expense_details}-${day}`;
      if (!emiMap.has(mapKey) && !manualKeys.has(manualCheck)) {
        emiMap.set(mapKey, day);
        const diffDays = calcDaysUntil(day);
        if (diffDays >= 0 && diffDays <= 3) {
          reminders.push({ type: 'EMI', detail: e.expense_details, dayOfMonth: day, daysUntil: diffDays, source: 'auto' });
        }
      }
    });

    // Auto-detected SIP
    const sipMap = new Map<string, number>();
    sipReminders?.forEach((s) => {
      const day = new Date(s.date).getDate();
      const mapKey = `${s.details.toLowerCase().trim()}-${day}`;
      const manualCheck = `SIP-${s.details}-${day}`;
      if (!sipMap.has(mapKey) && !manualKeys.has(manualCheck)) {
        sipMap.set(mapKey, day);
        const diffDays = calcDaysUntil(day);
        if (diffDays >= 0 && diffDays <= 3) {
          reminders.push({ type: 'SIP', detail: s.details, dayOfMonth: day, daysUntil: diffDays, source: 'auto' });
        }
      }
    });

    return reminders.filter((r) => !dismissed.includes(`${r.type}-${r.detail}-${r.dayOfMonth}`));
  };

  const reminders = getUpcomingReminders();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <Bell className="h-4 w-4" />
          Payment Reminders
        </h3>
        <ManageReminders />
      </div>
      {reminders.length === 0 && (
        <p className="text-xs text-muted-foreground">No upcoming reminders in the next 3 days.</p>
      )}
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
              {reminder.endDate && (
                <span className="text-xs ml-1">(Till {new Date(reminder.endDate).toLocaleDateString()})</span>
              )}
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
