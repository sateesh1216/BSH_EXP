import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, PiggyBank, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const MonthlySummaryCards = () => {
  const currentDate = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const { data: stats } = useQuery({
    queryKey: ['monthly-stats', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const [incomeResult, expensesResult, savingsResult] = await Promise.all([
        supabase
          .from('income')
          .select('amount')
          .gte('date', format(monthStart, 'yyyy-MM-dd'))
          .lte('date', format(monthEnd, 'yyyy-MM-dd')),
        supabase
          .from('expenses')
          .select('amount')
          .gte('date', format(monthStart, 'yyyy-MM-dd'))
          .lte('date', format(monthEnd, 'yyyy-MM-dd')),
        supabase
          .from('savings')
          .select('amount')
          .gte('date', format(monthStart, 'yyyy-MM-dd'))
          .lte('date', format(monthEnd, 'yyyy-MM-dd'))
      ]);

      const totalIncome = incomeResult.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const totalExpenses = expensesResult.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const totalSavings = savingsResult.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const netSavings = totalIncome - totalExpenses - totalSavings;

      return {
        totalIncome,
        totalExpenses,
        totalSavings,
        netSavings
      };
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Income Total</CardTitle>
          <TrendingUp className="h-4 w-4 text-expense-green" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-expense-green">
            {formatCurrency(stats?.totalIncome || 0)}
          </div>
          <p className="text-xs text-muted-foreground">Total income this month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Expenses Total</CardTitle>
          <TrendingDown className="h-4 w-4 text-expense-red" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-expense-red">
            {formatCurrency(stats?.totalExpenses || 0)}
          </div>
          <p className="text-xs text-muted-foreground">Total expenses this month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Savings Total</CardTitle>
          <PiggyBank className="h-4 w-4 text-expense-blue" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-expense-blue">
            {formatCurrency(stats?.totalSavings || 0)}
          </div>
          <p className="text-xs text-muted-foreground">Total savings this month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
          <DollarSign className="h-4 w-4 text-expense-purple" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${(stats?.netSavings || 0) >= 0 ? 'text-expense-green' : 'text-expense-red'}`}>
            {formatCurrency(stats?.netSavings || 0)}
          </div>
          <p className="text-xs text-muted-foreground">Income - Expenses - Savings</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlySummaryCards;