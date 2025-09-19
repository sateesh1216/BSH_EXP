import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface ReportsProps {
  selectedMonth: string;
  selectedYear: string;
}

const Reports = ({ selectedMonth, selectedYear }: ReportsProps) => {
  const { user } = useAuth();

  // Get yearly data for charts
  const { data: yearlyData } = useQuery({
    queryKey: ['yearly-reports', selectedYear],
    queryFn: async () => {
      let startDate, endDate;

      if (selectedYear === 'all') {
        // Show all available data
        startDate = '2020-01-01';
        endDate = format(new Date(), 'yyyy-MM-dd');
      } else {
        const year = parseInt(selectedYear);
        startDate = format(startOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd');
        endDate = format(endOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd');
      }

      const [incomeResult, expensesResult, savingsResult] = await Promise.all([
        supabase
          .from('income')
          .select('amount, date')
          .eq('user_id', user?.id)
          .gte('date', startDate)
          .lte('date', endDate),
        supabase
          .from('expenses')
          .select('amount, date')
          .eq('user_id', user?.id)
          .gte('date', startDate)
          .lte('date', endDate),
        supabase
          .from('savings')
          .select('amount, date')
          .eq('user_id', user?.id)
          .gte('date', startDate)
          .lte('date', endDate)
      ]);

      // Group by month and year
      const periodData: { [key: string]: { income: number; expenses: number; savings: number } } = {};
      
      if (selectedYear === 'all') {
        // Group by year when showing all years
        const currentYear = new Date().getFullYear();
        for (let year = 2020; year <= currentYear; year++) {
          periodData[year.toString()] = { income: 0, expenses: 0, savings: 0 };
        }

        // Process income data
        incomeResult.data?.forEach(item => {
          const year = format(new Date(item.date), 'yyyy');
          if (periodData[year]) {
            periodData[year].income += Number(item.amount);
          }
        });

        // Process expenses data
        expensesResult.data?.forEach(item => {
          const year = format(new Date(item.date), 'yyyy');
          if (periodData[year]) {
            periodData[year].expenses += Number(item.amount);
          }
        });

        // Process savings data
        savingsResult.data?.forEach(item => {
          const year = format(new Date(item.date), 'yyyy');
          if (periodData[year]) {
            periodData[year].savings += Number(item.amount);
          }
        });

        return Object.entries(periodData).map(([year, data]) => ({
          month: year,
          ...data,
          net: data.income - data.expenses - data.savings
        }));
      } else {
        // Group by month for specific year
        const year = parseInt(selectedYear);
        for (let i = 0; i < 12; i++) {
          const monthKey = String(i + 1).padStart(2, '0');
          periodData[monthKey] = { income: 0, expenses: 0, savings: 0 };
        }

        // Process income data
        incomeResult.data?.forEach(item => {
          const month = format(new Date(item.date), 'MM');
          periodData[month].income += Number(item.amount);
        });

        // Process expenses data
        expensesResult.data?.forEach(item => {
          const month = format(new Date(item.date), 'MM');
          periodData[month].expenses += Number(item.amount);
        });

        // Process savings data
        savingsResult.data?.forEach(item => {
          const month = format(new Date(item.date), 'MM');
          periodData[month].savings += Number(item.amount);
        });

        return Object.entries(periodData).map(([month, data]) => ({
          month: format(new Date(year, parseInt(month) - 1), 'MMM'),
          ...data,
          net: data.income - data.expenses - data.savings
        }));
      }
    },
    enabled: !!user?.id,
  });

  // Get summary data based on selected period
  const { data: summaryData } = useQuery({
    queryKey: ['summary-reports', selectedYear, selectedMonth],
    queryFn: async () => {
      let startDate, endDate;

      if (selectedYear === 'all') {
        // Show all available data
        startDate = '2020-01-01';
        endDate = format(new Date(), 'yyyy-MM-dd');
      } else {
        const year = parseInt(selectedYear);
        
        if (selectedMonth === 'all') {
          startDate = format(startOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd');
          endDate = format(endOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd');
        } else {
          const month = parseInt(selectedMonth) - 1;
          const date = new Date(year, month, 1);
          startDate = format(startOfMonth(date), 'yyyy-MM-dd');
          endDate = format(endOfMonth(date), 'yyyy-MM-dd');
        }
      }

      const [incomeResult, expensesResult, savingsResult] = await Promise.all([
        supabase
          .from('income')
          .select('amount')
          .eq('user_id', user?.id)
          .gte('date', startDate)
          .lte('date', endDate),
        supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', user?.id)
          .gte('date', startDate)
          .lte('date', endDate),
        supabase
          .from('savings')
          .select('amount')
          .eq('user_id', user?.id)
          .gte('date', startDate)
          .lte('date', endDate)
      ]);

      const totalIncome = incomeResult.data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const totalExpenses = expensesResult.data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const totalSavings = savingsResult.data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

      return {
        totalIncome,
        totalExpenses,
        totalSavings,
        netAmount: totalIncome - totalExpenses - totalSavings,
        inAccount: totalIncome - totalExpenses - totalSavings
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

  const getPeriodTitle = () => {
    if (selectedYear === 'all') {
      return 'All Years Report';
    }
    if (selectedMonth === 'all') {
      return `Year ${selectedYear} Report`;
    }
    return `${format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy')} Report`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense-green">
              {formatCurrency(summaryData?.totalIncome || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense-red">
              {formatCurrency(summaryData?.totalExpenses || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense-blue">
              {formatCurrency(summaryData?.totalSavings || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(summaryData?.netAmount || 0) >= 0 ? 'text-expense-green' : 'text-expense-red'}`}>
              {formatCurrency(summaryData?.netAmount || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedYear === 'all' ? 'Yearly Overview' : `Monthly Overview - ${selectedYear}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Bar dataKey="income" fill="hsl(var(--expense-green))" name="Income" />
                <Bar dataKey="expenses" fill="hsl(var(--expense-red))" name="Expenses" />
                <Bar dataKey="savings" fill="hsl(var(--expense-blue))" name="Savings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Net Amount Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedYear === 'all' ? 'Net Amount Trend - All Years' : `Net Amount Trend - ${selectedYear}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Line 
                  type="monotone" 
                  dataKey="net" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Net Amount"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Period Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{getPeriodTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-expense-green">Income Summary</h4>
              <p className="text-2xl font-bold text-expense-green">
                {formatCurrency(summaryData?.totalIncome || 0)}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-expense-red">Expenses Summary</h4>
              <p className="text-2xl font-bold text-expense-red">
                {formatCurrency(summaryData?.totalExpenses || 0)}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-expense-blue">In Account</h4>
              <p className="text-2xl font-bold text-expense-blue">
                {formatCurrency(summaryData?.inAccount || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;