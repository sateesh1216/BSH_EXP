import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sanitizeInput, validateAmount, validateDate, validateTextInput, checkRateLimit, rateLimitKey } from '@/lib/security';

const SavingsForm = () => {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState('');
  const [showSipAlert, setShowSipAlert] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setShowSipAlert(details.toLowerCase().includes('sip'));
  }, [details]);

  const addSavingsMutation = useMutation({
    mutationFn: async (savingsData: { date: string; amount: number; details: string }) => {
      const { data, error } = await supabase
        .from('savings')
        .insert([
          {
            user_id: user?.id,
            date: savingsData.date,
            amount: savingsData.amount,
            details: savingsData.details,
          },
        ])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Savings added successfully!",
      });
      // Reset form
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setAmount('');
      setDetails('');
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['savings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add savings",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!user?.id || !checkRateLimit(rateLimitKey(user.id, 'add_savings'), 20, 60000)) {
      toast({
        title: "Error",
        description: "Too many requests. Please wait a moment before trying again.",
        variant: "destructive",
      });
      return;
    }

    // Input validation and sanitization
    const sanitizedDetails = sanitizeInput(details);
    
    const detailsValidation = validateTextInput(sanitizedDetails, 'Savings details', 2, 200);
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

    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) {
      toast({
        title: "Error",
        description: amountValidation.error,
        variant: "destructive",
      });
      return;
    }

    addSavingsMutation.mutate({
      date,
      amount: parseFloat(amount),
      details: sanitizedDetails,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Add Savings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="savings-date">Date</Label>
              <Input
                id="savings-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="savings-details">Saving Details</Label>
              <Input
                id="savings-details"
                type="text"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Enter saving details"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="savings-amount">Amount (₹)</Label>
              <Input
                id="savings-amount"
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
          
          {showSipAlert && (
            <Alert variant="destructive" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-4 w-4 !text-yellow-600" />
              <AlertTitle>SIP Reminder</AlertTitle>
              <AlertDescription>
                Please verify the SIP due date before submitting. Ensure the date matches your SIP schedule.
              </AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={addSavingsMutation.isPending}
          >
            {addSavingsMutation.isPending ? 'Adding...' : 'Add Savings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SavingsForm;