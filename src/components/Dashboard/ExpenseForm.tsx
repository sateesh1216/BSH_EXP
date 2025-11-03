import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sanitizeInput, validateAmount, validateDate, validateTextInput, checkRateLimit, rateLimitKey } from '@/lib/security';

const ExpenseForm = () => {
  const [expenseDetails, setExpenseDetails] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMode, setPaymentMode] = useState('');
  const [amount, setAmount] = useState('');
  const [billFile, setBillFile] = useState<File | null>(null);
  const [warrantyFile, setWarrantyFile] = useState<File | null>(null);
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
    const allowedPaymentModes = ['card', 'upi', 'cash'];
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Add Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense-details">Expense Details</Label>
              <Input
                id="expense-details"
                value={expenseDetails}
                onChange={(e) => setExpenseDetails(e.target.value)}
                placeholder="e.g., Groceries, Rent, Utilities"
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
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
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
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;