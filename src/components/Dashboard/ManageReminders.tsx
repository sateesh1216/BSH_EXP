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
import { Settings, Plus, Trash2, Bell } from 'lucide-react';
import { toast } from 'sonner';

const ManageReminders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'EMI' | 'SIP'>('EMI');
  const [dayOfMonth, setDayOfMonth] = useState('');

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['recurring-reminders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_reminders')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('day_of_month', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const addMutation = useMutation({
    mutationFn: async (reminder: { label: string; type: string; day_of_month: number }) => {
      const { error } = await supabase
        .from('recurring_reminders')
        .insert([{ ...reminder, user_id: user?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['manual-reminders'] });
      toast.success('Reminder added successfully');
      setLabel('');
      setDayOfMonth('');
      setOpen(false);
    },
    onError: () => toast.error('Failed to add reminder'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_reminders')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['manual-reminders'] });
      toast.success('Reminder deleted');
    },
    onError: () => toast.error('Failed to delete reminder'),
  });

  const handleAdd = () => {
    const day = parseInt(dayOfMonth);
    if (!label.trim() || isNaN(day) || day < 1 || day > 31) {
      toast.error('Please enter a valid label and day (1-31)');
      return;
    }
    addMutation.mutate({ label: label.trim(), type, day_of_month: day });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings className="h-4 w-4" />
          Manage Reminders
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
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
                <Label>Label</Label>
                <Input
                  placeholder="e.g. Home Loan EMI, Mutual Fund SIP"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as 'EMI' | 'SIP')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMI">EMI (Expense)</SelectItem>
                      <SelectItem value="SIP">SIP (Savings)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Label>Day</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    placeholder="1-31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleAdd} disabled={addMutation.isPending} className="w-full gap-1.5">
                <Plus className="h-4 w-4" />
                Add Reminder
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
              reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                  <div>
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary mr-2">
                      {r.type}
                    </span>
                    <span className="text-sm font-medium">{r.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      — {r.day_of_month}th of every month
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(r.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageReminders;
