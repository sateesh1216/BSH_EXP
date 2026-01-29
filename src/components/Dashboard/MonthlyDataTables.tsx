import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useState, useMemo } from 'react';

const MonthlyDataTables = () => {
  const [incomeOpen, setIncomeOpen] = useState(true);
  const [expensesOpen, setExpensesOpen] = useState(true);
  const [savingsOpen, setSavingsOpen] = useState(true);

  const currentDate = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthKey = format(currentDate, 'yyyy-MM');

  const { data: incomeData } = useQuery({
    queryKey: ['income', monthKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('income')
        .select('*')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: expensesData } = useQuery({
    queryKey: ['expenses', monthKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: savingsData } = useQuery({
    queryKey: ['savings', monthKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings')
        .select('*')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Calculate average expense to determine high expenses
  const averageExpense = useMemo(() => {
    if (!expensesData || expensesData.length === 0) return 0;
    const total = expensesData.reduce((sum, expense) => sum + expense.amount, 0);
    return total / expensesData.length;
  }, [expensesData]);

  // An expense is "high" if it's above 1.5x the average
  const isHighExpense = (amount: number) => {
    return averageExpense > 0 && amount > averageExpense * 1.5;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatPaymentMode = (mode: string) => {
    const modeMap: Record<string, string> = {
      'debit_card': 'Debit Card',
      'credit_card': 'Credit Card',
      'upi': 'UPI',
      'cash': 'Cash',
      'auto_debit': 'Auto Debit',
      'online_banking': 'Online Banking',
      'card': 'Debit Card',
    };
    return modeMap[mode] || mode;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  return (
    <div className="space-y-6">
      {/* Income Table */}
      <Collapsible open={incomeOpen} onOpenChange={setIncomeOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-expense-green">
                  Monthly Income - {format(currentDate, 'MMMM yyyy')}
                </CardTitle>
                {incomeOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeData && incomeData.length > 0 ? (
                    incomeData.map((income) => (
                      <TableRow key={income.id}>
                        <TableCell className="font-medium">{income.source}</TableCell>
                        <TableCell>{formatDate(income.date)}</TableCell>
                        <TableCell className="text-right text-expense-green font-semibold">
                          {formatCurrency(income.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No income records for this month
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Expenses Table */}
      <Collapsible open={expensesOpen} onOpenChange={setExpensesOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-expense-red">
                  Monthly Expenses - {format(currentDate, 'MMMM yyyy')}
                </CardTitle>
                {expensesOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense Details</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expensesData && expensesData.length > 0 ? (
                    expensesData.map((expense) => (
                      <TableRow 
                        key={expense.id}
                        className={isHighExpense(expense.amount) ? 'bg-destructive/10 border-l-4 border-l-destructive' : ''}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {isHighExpense(expense.amount) && (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                            {expense.expense_details}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell>
                          <span className="capitalize bg-secondary px-2 py-1 rounded text-xs">
                            {formatPaymentMode(expense.payment_mode)}
                          </span>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${isHighExpense(expense.amount) ? 'text-destructive' : 'text-expense-red'}`}>
                          {formatCurrency(expense.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No expense records for this month
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Savings Table */}
      <Collapsible open={savingsOpen} onOpenChange={setSavingsOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-expense-blue">
                  Monthly Savings - {format(currentDate, 'MMMM yyyy')}
                </CardTitle>
                {savingsOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Saving Details</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savingsData && savingsData.length > 0 ? (
                    savingsData.map((saving) => (
                      <TableRow key={saving.id}>
                        <TableCell className="font-medium">{saving.details || 'N/A'}</TableCell>
                        <TableCell>{formatDate(saving.date)}</TableCell>
                        <TableCell className="text-right text-expense-blue font-semibold">
                          {formatCurrency(saving.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No savings records for this month
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default MonthlyDataTables;