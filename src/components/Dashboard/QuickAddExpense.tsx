import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sanitizeInput, validateAmount, validateDate, validateTextInput, checkRateLimit, rateLimitKey } from '@/lib/security';

const PRESET_CATEGORIES = [
  'Bike Petrol', 'Panipuri', 'Electricity/Power Bill', 'Chicken', 'Curd',
  'Home - 20 Lit Water Bottle', 'Fish', 'Movie Tickets', 'Gas', 'Milk',
  'D Mart', 'Groceries', 'Home - Rythu Bazar', 'Bus Tickets', 'Blinkit',
  'JioMart', 'Haircut', 'Rapido', 'Flipkart', 'Amazon', 'Myntra', 'AJio',
];

const QuickAddExpense = () => {
  const [open, setOpen] = useState(false);
  const [expenseDetails, setExpenseDetails] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMode, setPaymentMode] = useState('');
  const [amount, setAmount] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addExpenseMutation = useMutation({
    mutationFn: async (data: { expense_details: string; date: string; payment_mode: string; amount: number }) => {
      const { error } = await supabase
        .from('expenses')
        .insert([{ user_id: user?.id, ...data }])
        .select();
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Expense added!" });
      setExpenseDetails('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setPaymentMode('');
      setAmount('');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add expense", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !checkRateLimit(rateLimitKey(user.id, 'quick_expense'), 20, 60000)) {
      toast({ title: "Error", description: "Too many requests. Please wait.", variant: "destructive" });
      return;
    }
    const sanitized = sanitizeInput(expenseDetails);
    const v1 = validateTextInput(sanitized, 'Expense details', 2, 200);
    if (!v1.isValid) { toast({ title: "Error", description: v1.error, variant: "destructive" }); return; }
    const v2 = validateDate(date);
    if (!v2.isValid) { toast({ title: "Error", description: v2.error, variant: "destructive" }); return; }
    if (!paymentMode) { toast({ title: "Error", description: "Select a payment mode", variant: "destructive" }); return; }
    const allowedModes = ['debit_card', 'credit_card', 'upi', 'cash', 'auto_debit', 'online_banking'];
    if (!allowedModes.includes(paymentMode)) { toast({ title: "Error", description: "Invalid payment mode", variant: "destructive" }); return; }
    const v3 = validateAmount(amount);
    if (!v3.isValid) { toast({ title: "Error", description: v3.error, variant: "destructive" }); return; }

    addExpenseMutation.mutate({ expense_details: sanitized, date, payment_mode: paymentMode, amount: parseFloat(amount) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Add Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Preset Categories */}
          <div className="space-y-2">
            <Label>Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant={expenseDetails === cat ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/80 hover:text-primary-foreground transition-colors"
                  onClick={() => setExpenseDetails(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-details">Expense Details</Label>
            <Input
              id="quick-details"
              value={expenseDetails}
              onChange={(e) => setExpenseDetails(e.target.value)}
              placeholder="Or type your own..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quick-date">Date</Label>
              <Input id="quick-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-amount">Amount (₹)</Label>
              <Input id="quick-amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-payment">Payment Mode</Label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debit_card">Debit Card</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="auto_debit">Auto Debit</SelectItem>
                <SelectItem value="online_banking">Online Banking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={addExpenseMutation.isPending}>
            {addExpenseMutation.isPending ? 'Adding...' : 'Add Expense'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddExpense;
