import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, PiggyBank, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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

  const getDateRange = () => {
    if (selectedYear === 'all') {
      return {
        start: '2020-01-01',
        end: format(new Date(), 'yyyy-MM-dd')
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
      const inAccount = totalIncome - totalExpenses - totalSavings;

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
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const cards = [
    {
      title: 'Total Income',
      value: stats?.totalIncome || 0,
      icon: TrendingUp,
      trend: ArrowUpRight,
      gradient: 'from-success/20 via-success/10 to-transparent',
      iconBg: 'bg-success/15',
      iconColor: 'text-success',
      valueColor: 'text-success',
      borderColor: 'border-success/20',
    },
    {
      title: 'Total Expenses',
      value: stats?.totalExpenses || 0,
      icon: TrendingDown,
      trend: ArrowDownRight,
      gradient: 'from-expense-red/20 via-expense-red/10 to-transparent',
      iconBg: 'bg-expense-red/15',
      iconColor: 'text-expense-red',
      valueColor: 'text-expense-red',
      borderColor: 'border-expense-red/20',
    },
    {
      title: 'Total Savings',
      value: stats?.totalSavings || 0,
      icon: PiggyBank,
      trend: ArrowUpRight,
      gradient: 'from-expense-blue/20 via-expense-blue/10 to-transparent',
      iconBg: 'bg-expense-blue/15',
      iconColor: 'text-expense-blue',
      valueColor: 'text-expense-blue',
      borderColor: 'border-expense-blue/20',
    },
    {
      title: 'In Account',
      value: stats?.inAccount || 0,
      icon: Wallet,
      trend: (stats?.inAccount || 0) >= 0 ? ArrowUpRight : ArrowDownRight,
      gradient: (stats?.inAccount || 0) >= 0 
        ? 'from-primary/20 via-primary/10 to-transparent' 
        : 'from-expense-red/20 via-expense-red/10 to-transparent',
      iconBg: (stats?.inAccount || 0) >= 0 ? 'bg-primary/15' : 'bg-expense-red/15',
      iconColor: (stats?.inAccount || 0) >= 0 ? 'text-primary' : 'text-expense-red',
      valueColor: (stats?.inAccount || 0) >= 0 ? 'text-primary' : 'text-expense-red',
      borderColor: (stats?.inAccount || 0) >= 0 ? 'border-primary/20' : 'border-expense-red/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const TrendIcon = card.trend;
        return (
          <Card 
            key={card.title}
            className={`relative overflow-hidden border ${card.borderColor} bg-card/60 backdrop-blur-sm hover-lift transition-all duration-300`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
            
            <CardContent className="relative p-4 sm:p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <div className={`p-1.5 rounded-lg ${card.iconBg}`}>
                  <TrendIcon className={`h-3.5 w-3.5 ${card.iconColor}`} />
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className={`text-2xl sm:text-3xl font-bold tracking-tight ${card.valueColor}`}>
                  {formatCurrency(card.value)}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MonthlySummaryCards;