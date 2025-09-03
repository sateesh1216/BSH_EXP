import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sanitizeInput, validateAmount, validateDate, validateTextInput, checkRateLimit, rateLimitKey } from '@/lib/security';

const IncomeForm = () => {
  const [source, setSource] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addIncomeMutation = useMutation({
    mutationFn: async (incomeData: { source: string; date: string; amount: number }) => {
      const { data, error } = await supabase
        .from('income')
        .insert([
          {
            user_id: user?.id,
            source: incomeData.source,
            date: incomeData.date,
            amount: incomeData.amount,
          },
        ])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Income added successfully!",
      });
      // Reset form
      setSource('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setAmount('');
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add income",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!user?.id || !checkRateLimit(rateLimitKey(user.id, 'add_income'), 20, 60000)) {
      toast({
        title: "Error",
        description: "Too many requests. Please wait a moment before trying again.",
        variant: "destructive",
      });
      return;
    }

    // Input validation and sanitization
    const sanitizedSource = sanitizeInput(source);
    
    const sourceValidation = validateTextInput(sanitizedSource, 'Source', 2, 100);
    if (!sourceValidation.isValid) {
      toast({
        title: "Error",
        description: sourceValidation.error,
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

    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) {
      toast({
        title: "Error",
        description: amountValidation.error,
        variant: "destructive",
      });
      return;
    }

    addIncomeMutation.mutate({
      source: sanitizedSource,
      date,
      amount: parseFloat(amount),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Add Income</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g., Salary, Freelance"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
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
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={addIncomeMutation.isPending}
          >
            {addIncomeMutation.isPending ? 'Adding...' : 'Add Income'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default IncomeForm;