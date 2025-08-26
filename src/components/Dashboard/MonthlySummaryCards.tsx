import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, PiggyBank, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface MonthlySummaryCardsProps {
  selectedMonth: string;
  selectedYear: string;
}

const MonthlySummaryCards = ({ selectedMonth, selectedYear }: MonthlySummaryCardsProps) => {
  const { user } = useAuth();

  // Calculate date range based on filters
  const getDateRange = () => {
    const year = parseInt(selectedYear);
    
    if (selectedMonth === 'all') {
      return {
        start: format(startOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd'),
        end: format(endOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd')
      };
    } else {
      const month = parseInt(selectedMonth) - 1;
      const date = new Date(year, month, 1);
      return {
        start: format(startOfMonth(date), 'yyyy-MM-dd'),
        end: format(endOfMonth(date), 'yyyy-MM-dd')
      };
    }
  };

  const { start, end } = getDateRange();

  const { data: stats } = useQuery({
    queryKey: ['monthly-stats', selectedYear, selectedMonth],
    queryFn: async () => {
      const [incomeResult, expensesResult, savingsResult] = await Promise.all([
        supabase
          .from('income')
          .select('amount')
          .eq('user_id', user?.id)
          .gte('date', start)
          .lte('date', end),
        supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', user?.id)
          .gte('date', start)
          .lte('date', end),
        supabase
          .from('savings')
          .select('amount')
          .eq('user_id', user?.id)
          .gte('date', start)
          .lte('date', end)
      ]);

      const totalIncome = incomeResult.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const totalExpenses = expensesResult.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const totalSavings = savingsResult.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const inAccount = totalSavings; // This represents the accumulated savings (In Account)

      return {
        totalIncome,
        totalExpenses,
        totalSavings,
        inAccount
      };
    },
    enabled: !!user?.id,
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
          <CardTitle className="text-sm font-medium">In Account</CardTitle>
          <DollarSign className="h-4 w-4 text-expense-purple" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-expense-blue">
            {formatCurrency(stats?.inAccount || 0)}
          </div>
          <p className="text-xs text-muted-foreground">Total savings accumulated</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlySummaryCards;