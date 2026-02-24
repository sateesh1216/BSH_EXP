import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Plus, Trash2, Bell, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ReminderRow {
  id: string;
  label: string;
  type: string;
  day_of_month: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
}

const TYPES = [
  { value: 'EMI', label: 'EMI (Expense)' },
  { value: 'SIP', label: 'SIP (Savings)' },
  { value: 'Expense', label: 'Other Expense' },
  { value: 'Savings', label: 'Other Savings' },
];

const ManageReminders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<string>('EMI');
  const [dayOfMonth, setDayOfMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ReminderRow>>({});

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['recurring-reminders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_reminders')
        .select('*')
        .eq('user_id', user?.id)
        .order('day_of_month', { ascending: true });
      if (error) throw error;
      return data as ReminderRow[];
    },
    enabled: !!user?.id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['recurring-reminders'] });
    queryClient.invalidateQueries({ queryKey: ['manual-reminders'] });
  };

  const addMutation = useMutation({
    mutationFn: async (reminder: { label: string; type: string; day_of_month: number; start_date?: string; end_date?: string }) => {
      const { error } = await supabase
        .from('recurring_reminders')
        .insert([{ ...reminder, user_id: user?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Reminder added successfully');
      setLabel(''); setDayOfMonth(''); setStartDate(''); setEndDate('');
    },
    onError: () => toast.error('Failed to add reminder'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('recurring_reminders')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Reminder updated');
      setEditingId(null);
    },
    onError: () => toast.error('Failed to update reminder'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_reminders')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Reminder deleted'); },
    onError: () => toast.error('Failed to delete reminder'),
  });

  const handleAdd = () => {
    const day = parseInt(dayOfMonth);
    if (!label.trim() || isNaN(day) || day < 1 || day > 31) {
      toast.error('Please enter a valid label and day (1-31)');
      return;
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.error('Start date must be before end date');
      return;
    }
    addMutation.mutate({
      label: label.trim(),
      type,
      day_of_month: day,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
  };

  const startEdit = (r: ReminderRow) => {
    setEditingId(r.id);
    setEditForm({
      label: r.label,
      type: r.type,
      day_of_month: r.day_of_month,
      start_date: r.start_date,
      end_date: r.end_date,
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    const day = editForm.day_of_month;
    if (!editForm.label?.trim() || !day || day < 1 || day > 31) {
      toast.error('Please enter a valid label and day (1-31)');
      return;
    }
    updateMutation.mutate({
      id: editingId,
      updates: {
        label: editForm.label?.trim(),
        type: editForm.type,
        day_of_month: day,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
      },
    });
  };

  const toggleActive = (id: string, currentActive: boolean) => {
    updateMutation.mutate({ id, updates: { is_active: !currentActive } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings className="h-4 w-4" />
          Manage Reminders
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Manage Recurring Reminders
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new reminder */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Add New Reminder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Label (Expense/Savings name)</Label>
                <Input placeholder="e.g. Home Loan EMI, SBI Gold SIP, Rent" value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Label>Day</Label>
                  <Input type="number" min={1} max={31} placeholder="1-31" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>From Date (optional)</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="flex-1">
                  <Label>Till Date (optional)</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Leave dates empty for permanent reminders.</p>
              <Button onClick={handleAdd} disabled={addMutation.isPending} className="w-full gap-1.5">
                <Plus className="h-4 w-4" /> Add Reminder
              </Button>
            </CardContent>
          </Card>

          {/* Existing reminders */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Your Reminders</h4>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !reminders?.length ? (
              <p className="text-sm text-muted-foreground">No reminders set yet.</p>
            ) : (
              reminders.map((r) =>
                editingId === r.id ? (
                  <div key={r.id} className="p-3 border rounded-lg bg-card space-y-2">
                    <Input value={editForm.label || ''} onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))} placeholder="Label" />
                    <div className="flex gap-2">
                      <Select value={editForm.type || 'EMI'} onValueChange={(v) => setEditForm((f) => ({ ...f, type: v }))}>
                        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input className="w-20" type="number" min={1} max={31} value={editForm.day_of_month || ''} onChange={(e) => setEditForm((f) => ({ ...f, day_of_month: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <div className="flex gap-2">
                      <Input type="date" value={editForm.start_date || ''} onChange={(e) => setEditForm((f) => ({ ...f, start_date: e.target.value || null }))} />
                      <Input type="date" value={editForm.end_date || ''} onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value || null }))} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                      <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}><Check className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <div key={r.id} className={`flex items-center justify-between p-3 border rounded-lg bg-card ${!r.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{r.type}</span>
                        <span className="text-sm font-medium truncate">{r.label}</span>
                        <span className="text-xs text-muted-foreground">— {r.day_of_month}th of every month</span>
                      </div>
                      {(r.start_date || r.end_date) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {r.start_date ? format(new Date(r.start_date), 'dd MMM yyyy') : 'Start'}
                          {' → '}
                          {r.end_date ? format(new Date(r.end_date), 'dd MMM yyyy') : 'Ongoing'}
                        </p>
                      )}
                      {!r.is_active && <p className="text-xs text-muted-foreground mt-0.5 italic">Paused</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r.id, r.is_active)} className="scale-75" />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(r.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageReminders;
