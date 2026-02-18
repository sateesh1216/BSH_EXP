import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sanitizeInput, validateAmount, validateDate, validateTextInput, checkRateLimit, rateLimitKey } from '@/lib/security';

const PRESET_CATEGORIES = [
  'Groceries', 'Rent', 'Fuel', 'Electricity', 'Water Bill',
  'Internet', 'Mobile Recharge', 'Food & Dining', 'Transport',
  'Medical', 'Shopping', 'Entertainment', 'Education', 'Insurance',
];

const PAYMENT_MODES = [
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'auto_debit', label: 'Auto Debit' },
  { value: 'online_banking', label: 'Online Banking' },
];

type BulkRow = { expense_details: string; date: string; payment_mode: string; amount: string };
const emptyRow = (): BulkRow => ({ expense_details: '', date: format(new Date(), 'yyyy-MM-dd'), payment_mode: '', amount: '' });

const ExpenseForm = () => {
  const [expenseDetails, setExpenseDetails] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMode, setPaymentMode] = useState('');
  const [amount, setAmount] = useState('');
  const [billFile, setBillFile] = useState<File | null>(null);
  const [warrantyFile, setWarrantyFile] = useState<File | null>(null);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addExpenseMutation = useMutation({
    mutationFn: async (expenseData: { 
      expense_details: string; 
      date: string; 
      payment_mode: string; 
      amount: number;
      bill_file?: File;
      warranty_file?: File;
    }) => {
      let billUrl = null;
      let warrantyUrl = null;

      // Upload bill file if provided
      if (expenseData.bill_file && user?.id) {
        const fileExt = expenseData.bill_file.name.split('.').pop();
        const fileName = `${user.id}/bills/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('expense-attachments')
          .upload(fileName, expenseData.bill_file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('expense-attachments')
          .getPublicUrl(fileName);
        
        billUrl = publicUrl;
      }

      // Upload warranty file if provided
      if (expenseData.warranty_file && user?.id) {
        const fileExt = expenseData.warranty_file.name.split('.').pop();
        const fileName = `${user.id}/warranties/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('expense-attachments')
          .upload(fileName, expenseData.warranty_file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('expense-attachments')
          .getPublicUrl(fileName);
        
        warrantyUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert([
          {
            user_id: user?.id,
            expense_details: expenseData.expense_details,
            date: expenseData.date,
            payment_mode: expenseData.payment_mode,
            amount: expenseData.amount,
            attachment_url: billUrl,
            warranty_url: warrantyUrl,
          },
        ])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense added successfully!",
      });
      // Reset form
      setExpenseDetails('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setPaymentMode('');
      setAmount('');
      setBillFile(null);
      setWarrantyFile(null);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!user?.id || !checkRateLimit(rateLimitKey(user.id, 'add_expense'), 20, 60000)) {
      toast({
        title: "Error",
        description: "Too many requests. Please wait a moment before trying again.",
        variant: "destructive",
      });
      return;
    }

    // Input validation and sanitization
    const sanitizedExpenseDetails = sanitizeInput(expenseDetails);
    
    const detailsValidation = validateTextInput(sanitizedExpenseDetails, 'Expense details', 2, 200);
    if (!detailsValidation.isValid) {
      toast({
        title: "Error",
        description: detailsValidation.error,
        variant: "destructive",
      });
      return;
    }

    const dateValidation = validateDate(date);
    if (!dateValidation.isValid) {
      toast({
        title: "Error",
        description: dateValidation.error,
        variant: "destructive",
      });
      return;
    }

    if (!paymentMode) {
      toast({
        title: "Error",
        description: "Please select a payment mode",
        variant: "destructive",
      });
      return;
    }

    // Validate payment mode against allowed values
    const allowedPaymentModes = ['debit_card', 'credit_card', 'upi', 'cash', 'auto_debit', 'online_banking'];
    if (!allowedPaymentModes.includes(paymentMode)) {
      toast({
        title: "Error",
        description: "Invalid payment mode selected",
        variant: "destructive",
      });
      return;
    }

    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) {
      toast({
        title: "Error",
        description: amountValidation.error,
        variant: "destructive",
      });
      return;
    }

    // Validate bill file if provided
    if (billFile) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(billFile.type)) {
        toast({
          title: "Error",
          description: "Bill: Only JPG, PNG, WEBP, and PDF files are allowed",
          variant: "destructive",
        });
        return;
      }
      if (billFile.size > 5242880) { // 5MB
        toast({
          title: "Error",
          description: "Bill: File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate warranty file if provided
    if (warrantyFile) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(warrantyFile.type)) {
        toast({
          title: "Error",
          description: "Warranty: Only JPG, PNG, WEBP, and PDF files are allowed",
          variant: "destructive",
        });
        return;
      }
      if (warrantyFile.size > 5242880) { // 5MB
        toast({
          title: "Error",
          description: "Warranty: File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
    }

    addExpenseMutation.mutate({
      expense_details: sanitizedExpenseDetails,
      date,
      payment_mode: paymentMode,
      amount: parseFloat(amount),
      bill_file: billFile || undefined,
      warranty_file: warrantyFile || undefined,
    });
  };

  const updateBulkRow = (index: number, field: keyof BulkRow, value: string) => {
    setBulkRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const addBulkRow = () => setBulkRows(prev => [...prev, emptyRow()]);

  const removeBulkRow = (index: number) => {
    if (bulkRows.length > 1) setBulkRows(prev => prev.filter((_, i) => i !== index));
  };

  const bulkMutation = useMutation({
    mutationFn: async (rows: { expense_details: string; date: string; payment_mode: string; amount: number; user_id: string }[]) => {
      const { error } = await supabase.from('expenses').insert(rows).select();
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "All expenses added!" });
      setBulkRows([emptyRow(), emptyRow(), emptyRow()]);
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add expenses", variant: "destructive" });
    },
  });

  const handleBulkSubmit = () => {
    if (!user?.id) return;
    const validRows = bulkRows.filter(r => r.expense_details.trim() && r.amount && r.payment_mode && r.date);
    if (validRows.length === 0) {
      toast({ title: "Error", description: "Fill in at least one complete row", variant: "destructive" });
      return;
    }
    const allowedModes = ['debit_card', 'credit_card', 'upi', 'cash', 'auto_debit', 'online_banking'];
    for (const row of validRows) {
      if (!allowedModes.includes(row.payment_mode)) {
        toast({ title: "Error", description: `Invalid payment mode in row`, variant: "destructive" });
        return;
      }
      const av = validateAmount(row.amount);
      if (!av.isValid) {
        toast({ title: "Error", description: `${row.expense_details}: ${av.error}`, variant: "destructive" });
        return;
      }
    }
    bulkMutation.mutate(validRows.map(r => ({
      user_id: user.id,
      expense_details: sanitizeInput(r.expense_details),
      date: r.date,
      payment_mode: r.payment_mode,
      amount: parseFloat(r.amount),
    })));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Add Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="single">Single Entry</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Preset Categories */}
              <div className="space-y-2">
                <Label>Quick Select Category</Label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expense-details">Expense Details</Label>
                  <Input
                    id="expense-details"
                    value={expenseDetails}
                    onChange={(e) => setExpenseDetails(e.target.value)}
                    placeholder="Or type your own..."
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expense-date">Date</Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payment-mode">Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expense-amount">Amount (₹)</Label>
                  <Input
                    id="expense-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bill">Bill Attachment</Label>
                  <Input
                    id="bill"
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                    onChange={(e) => setBillFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Upload bill (JPG, PNG, WEBP, PDF - Max 5MB)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warranty">Warranty Card</Label>
                  <Input
                    id="warranty"
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                    onChange={(e) => setWarrantyFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Upload warranty card (JPG, PNG, WEBP, PDF - Max 5MB)
                  </p>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={addExpenseMutation.isPending}
              >
                {addExpenseMutation.isPending ? 'Adding...' : 'Add Expense'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="bulk">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter multiple expenses at once. Fill in the rows and submit all together.</p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Details</TableHead>
                      <TableHead className="min-w-[140px]">Date</TableHead>
                      <TableHead className="min-w-[150px]">Payment Mode</TableHead>
                      <TableHead className="min-w-[100px]">Amount (₹)</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Input
                            value={row.expense_details}
                            onChange={(e) => updateBulkRow(i, 'expense_details', e.target.value)}
                            placeholder="e.g., Groceries"
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={row.date}
                            onChange={(e) => updateBulkRow(i, 'date', e.target.value)}
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={row.payment_mode} onValueChange={(v) => updateBulkRow(i, 'payment_mode', v)}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Mode" />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_MODES.map(m => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.amount}
                            onChange={(e) => updateBulkRow(i, 'amount', e.target.value)}
                            placeholder="0.00"
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeBulkRow(i)} disabled={bulkRows.length <= 1}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addBulkRow}>
                  <Plus className="h-4 w-4 mr-1" /> Add Row
                </Button>
                <Button
                  type="button"
                  className="ml-auto"
                  onClick={handleBulkSubmit}
                  disabled={bulkMutation.isPending}
                >
                  {bulkMutation.isPending ? 'Adding...' : `Add ${bulkRows.filter(r => r.expense_details.trim() && r.amount).length} Expenses`}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;