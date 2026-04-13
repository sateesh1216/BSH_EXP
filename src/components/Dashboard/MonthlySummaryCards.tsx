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
    if (selectedYear === 'all') {
      // Show all available data
      return {
        start: '2020-01-01', // Start from a reasonable past date
        end: format(new Date(), 'yyyy-MM-dd') // End at today
      };
    }

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
      const inAccount = totalIncome - totalExpenses - totalSavings; // Monthly income - Monthly Expenses - Monthly Savings = In Account

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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-8">
      <Card className="group bg-success/5 border-success/20 shadow-card hover-lift animate-fade-in backdrop-blur-sm overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 p-4 sm:p-6 relative">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Monthly Income Total</CardTitle>
          <div className="p-1.5 sm:p-2 bg-success/10 rounded-full group-hover:bg-success/20 transition-colors duration-300">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 relative">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-success mb-0.5 sm:mb-1 tabular-nums tracking-tight">
            {formatCurrency(stats?.totalIncome || 0)}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Total income this period</p>
        </CardContent>
      </Card>

      <Card className="group bg-expense-red/5 border-expense-red/20 shadow-card hover-lift animate-fade-in [animation-delay:80ms] backdrop-blur-sm overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-expense-red/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 p-4 sm:p-6 relative">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Monthly Expenses Total</CardTitle>
          <div className="p-1.5 sm:p-2 bg-expense-red/10 rounded-full group-hover:bg-expense-red/20 transition-colors duration-300">
            <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-expense-red" />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 relative">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-expense-red mb-0.5 sm:mb-1 tabular-nums tracking-tight">
            {formatCurrency(stats?.totalExpenses || 0)}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Total expenses this period</p>
        </CardContent>
      </Card>

      <Card className="group bg-expense-blue/5 border-expense-blue/20 shadow-card hover-lift animate-fade-in [animation-delay:160ms] backdrop-blur-sm overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-expense-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 p-4 sm:p-6 relative">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Monthly Savings Total</CardTitle>
          <div className="p-1.5 sm:p-2 bg-expense-blue/10 rounded-full group-hover:bg-expense-blue/20 transition-colors duration-300">
            <PiggyBank className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-expense-blue" />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 relative">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-expense-blue mb-0.5 sm:mb-1 tabular-nums tracking-tight">
            {formatCurrency(stats?.totalSavings || 0)}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Total savings this period</p>
        </CardContent>
      </Card>

      <Card className="group bg-primary/5 border-primary/20 shadow-card hover-lift animate-fade-in [animation-delay:240ms] backdrop-blur-sm overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 p-4 sm:p-6 relative">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">In Account</CardTitle>
          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors duration-300">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 relative">
          <div className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-0.5 sm:mb-1 tabular-nums tracking-tight ${
            (stats?.inAccount || 0) >= 0 ? 'text-success' : 'text-expense-red'
          }`}>
            {formatCurrency(stats?.inAccount || 0)}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Available balance</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlySummaryCards;