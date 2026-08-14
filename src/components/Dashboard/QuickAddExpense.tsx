import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  'House Rent', 'Travel', 'Parties', 'Donations',
];

const QuickAddExpense = () => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('expense');
  
  // Expense fields
  const [expenseDetails, setExpenseDetails] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMode, setPaymentMode] = useState('upi');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Income fields
  const [incomeSource, setIncomeSource] = useState('');
  const [incomeDate, setIncomeDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [incomeAmount, setIncomeAmount] = useState('');

  // Savings fields
  const [savingsDetails, setSavingsDetails] = useState('');
  const [savingsDate, setSavingsDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [savingsAmount, setSavingsAmount] = useState('');

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resetAll = () => {
    setExpenseDetails(''); setExpenseDate(format(new Date(), 'yyyy-MM-dd')); setPaymentMode('upi'); setExpenseAmount('');
    setIncomeSource(''); setIncomeDate(format(new Date(), 'yyyy-MM-dd')); setIncomeAmount('');
    setSavingsDetails(''); setSavingsDate(format(new Date(), 'yyyy-MM-dd')); setSavingsAmount('');
  };

  const addExpenseMutation = useMutation({
    mutationFn: async (data: { expense_details: string; date: string; payment_mode: string; amount: number }) => {
      const { error } = await supabase.from('expenses').insert([{ user_id: user?.id, ...data }]).select();
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Expense added!" });
      resetAll(); setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add expense", variant: "destructive" });
    },
  });

  const addIncomeMutation = useMutation({
    mutationFn: async (data: { source: string; date: string; amount: number }) => {
      const { error } = await supabase.from('income').insert([{ user_id: user?.id, ...data }]).select();
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Income added!" });
      resetAll(); setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add income", variant: "destructive" });
    },
  });

  const addSavingsMutation = useMutation({
    mutationFn: async (data: { details: string; date: string; amount: number }) => {
      const { error } = await supabase.from('savings').insert([{ user_id: user?.id, ...data }]).select();
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Savings added!" });
      resetAll(); setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['savings'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add savings", variant: "destructive" });
    },
  });

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !checkRateLimit(rateLimitKey(user.id, 'quick_expense'), 20, 60000)) {
      toast({ title: "Error", description: "Too many requests. Please wait.", variant: "destructive" }); return;
    }
    const sanitized = sanitizeInput(expenseDetails);
    const v1 = validateTextInput(sanitized, 'Expense details', 2, 200);
    if (!v1.isValid) { toast({ title: "Error", description: v1.error, variant: "destructive" }); return; }
    const v2 = validateDate(expenseDate);
    if (!v2.isValid) { toast({ title: "Error", description: v2.error, variant: "destructive" }); return; }
    if (!paymentMode) { toast({ title: "Error", description: "Select a payment mode", variant: "destructive" }); return; }
    const v3 = validateAmount(expenseAmount);
    if (!v3.isValid) { toast({ title: "Error", description: v3.error, variant: "destructive" }); return; }
    addExpenseMutation.mutate({ expense_details: sanitized, date: expenseDate, payment_mode: paymentMode, amount: parseFloat(expenseAmount) });
  };

  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !checkRateLimit(rateLimitKey(user.id, 'quick_income'), 20, 60000)) {
      toast({ title: "Error", description: "Too many requests. Please wait.", variant: "destructive" }); return;
    }
    const sanitized = sanitizeInput(incomeSource);
    const v1 = validateTextInput(sanitized, 'Source', 2, 100);
    if (!v1.isValid) { toast({ title: "Error", description: v1.error, variant: "destructive" }); return; }
    const v2 = validateDate(incomeDate);
    if (!v2.isValid) { toast({ title: "Error", description: v2.error, variant: "destructive" }); return; }
    const v3 = validateAmount(incomeAmount);
    if (!v3.isValid) { toast({ title: "Error", description: v3.error, variant: "destructive" }); return; }
    addIncomeMutation.mutate({ source: sanitized, date: incomeDate, amount: parseFloat(incomeAmount) });
  };

  const handleSavingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !checkRateLimit(rateLimitKey(user.id, 'quick_savings'), 20, 60000)) {
      toast({ title: "Error", description: "Too many requests. Please wait.", variant: "destructive" }); return;
    }
    const sanitized = sanitizeInput(savingsDetails);
    const v1 = validateTextInput(sanitized, 'Details', 2, 100);
    if (!v1.isValid) { toast({ title: "Error", description: v1.error, variant: "destructive" }); return; }
    const v2 = validateDate(savingsDate);
    if (!v2.isValid) { toast({ title: "Error", description: v2.error, variant: "destructive" }); return; }
    const v3 = validateAmount(savingsAmount);
    if (!v3.isValid) { toast({ title: "Error", description: v3.error, variant: "destructive" }); return; }
    addSavingsMutation.mutate({ details: sanitized, date: savingsDate, amount: parseFloat(savingsAmount) });
  };

  const isPending = addExpenseMutation.isPending || addIncomeMutation.isPending || addSavingsMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bottom-6 right-4 sm:right-6 h-14 w-14 rounded-full shadow-glow active:scale-90 transition-transform z-50"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Add</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="income" className="gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5" />
              Income
            </TabsTrigger>
            <TabsTrigger value="expense" className="gap-1.5 text-xs">
              <TrendingDown className="h-3.5 w-3.5" />
              Expense
            </TabsTrigger>
            <TabsTrigger value="savings" className="gap-1.5 text-xs">
              <PiggyBank className="h-3.5 w-3.5" />
              Savings
            </TabsTrigger>
          </TabsList>

          {/* Income Tab */}
          <TabsContent value="income">
            <form onSubmit={handleIncomeSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="qi-source">Source</Label>
                <Input id="qi-source" value={incomeSource} onChange={(e) => setIncomeSource(e.target.value)} placeholder="e.g., Salary, Freelance" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qi-date">Date</Label>
                  <Input id="qi-date" type="date" value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qi-amount">Amount (₹)</Label>
                  <Input id="qi-amount" type="number" step="0.01" min="0" value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} placeholder="0.00" required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {addIncomeMutation.isPending ? 'Adding...' : 'Add Income'}
              </Button>
            </form>
          </TabsContent>

          {/* Expense Tab */}
          <TabsContent value="expense">
            <form onSubmit={handleExpenseSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Quick Select</Label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {PRESET_CATEGORIES.map((cat) => (
                    <Badge
                      key={cat}
                      variant={expenseDetails === cat ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-primary/80 hover:text-primary-foreground transition-colors text-xs"
                      onClick={() => setExpenseDetails(cat)}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qe-details">Expense Details</Label>
                <Input id="qe-details" value={expenseDetails} onChange={(e) => setExpenseDetails(e.target.value)} placeholder="Or type your own..." required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qe-date">Date</Label>
                  <Input id="qe-date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qe-amount">Amount (₹)</Label>
                  <Input id="qe-amount" type="number" step="0.01" min="0" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0.00" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qe-payment">Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger><SelectValue placeholder="Select payment mode" /></SelectTrigger>
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
              <Button type="submit" className="w-full" disabled={isPending}>
                {addExpenseMutation.isPending ? 'Adding...' : 'Add Expense'}
              </Button>
            </form>
          </TabsContent>

          {/* Savings Tab */}
          <TabsContent value="savings">
            <form onSubmit={handleSavingsSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="qs-details">Details</Label>
                <Input id="qs-details" value={savingsDetails} onChange={(e) => setSavingsDetails(e.target.value)} placeholder="e.g., FD, SIP, PPF" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qs-date">Date</Label>
                  <Input id="qs-date" type="date" value={savingsDate} onChange={(e) => setSavingsDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qs-amount">Amount (₹)</Label>
                  <Input id="qs-amount" type="number" step="0.01" min="0" value={savingsAmount} onChange={(e) => setSavingsAmount(e.target.value)} placeholder="0.00" required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {addSavingsMutation.isPending ? 'Adding...' : 'Add Savings'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddExpense;
