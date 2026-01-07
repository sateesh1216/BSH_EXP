import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight, BarChart3, LineChartIcon, PieChartIcon } from 'lucide-react';

interface ReportsProps {
  selectedMonth: string;
  selectedYear: string;
}

const COLORS = ['hsl(var(--income-green))', 'hsl(var(--expense-red))', 'hsl(var(--savings-blue))'];

const Reports = ({ selectedMonth, selectedYear }: ReportsProps) => {
  const { user } = useAuth();

  // Get yearly data for charts
  const { data: yearlyData } = useQuery({
    queryKey: ['yearly-reports', selectedYear],
    queryFn: async () => {
      let startDate, endDate;

      if (selectedYear === 'all') {
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

      const periodData: { [key: string]: { income: number; expenses: number; savings: number } } = {};
      
      if (selectedYear === 'all') {
        const currentYear = new Date().getFullYear();
        for (let year = 2020; year <= currentYear; year++) {
          periodData[year.toString()] = { income: 0, expenses: 0, savings: 0 };
        }

        incomeResult.data?.forEach(item => {
          const year = format(new Date(item.date), 'yyyy');
          if (periodData[year]) {
            periodData[year].income += Number(item.amount);
          }
        });

        expensesResult.data?.forEach(item => {
          const year = format(new Date(item.date), 'yyyy');
          if (periodData[year]) {
            periodData[year].expenses += Number(item.amount);
          }
        });

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
        const year = parseInt(selectedYear);
        for (let i = 0; i < 12; i++) {
          const monthKey = String(i + 1).padStart(2, '0');
          periodData[monthKey] = { income: 0, expenses: 0, savings: 0 };
        }

        incomeResult.data?.forEach(item => {
          const month = format(new Date(item.date), 'MM');
          periodData[month].income += Number(item.amount);
        });

        expensesResult.data?.forEach(item => {
          const month = format(new Date(item.date), 'MM');
          periodData[month].expenses += Number(item.amount);
        });

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

  // Pie chart data
  const pieData = [
    { name: 'Income', value: summaryData?.totalIncome || 0 },
    { name: 'Expenses', value: summaryData?.totalExpenses || 0 },
    { name: 'Savings', value: summaryData?.totalSavings || 0 },
  ].filter(item => item.value > 0);

  const savingsRate = summaryData?.totalIncome 
    ? ((summaryData.totalSavings / summaryData.totalIncome) * 100).toFixed(1)
    : '0';

  const expenseRate = summaryData?.totalIncome 
    ? ((summaryData.totalExpenses / summaryData.totalIncome) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Period Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{getPeriodTitle()}</h2>
          <p className="text-muted-foreground text-sm">Financial overview and analytics</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-income-green/10 rounded-bl-full" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-income-green" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-income-green">
              {formatCurrency(summaryData?.totalIncome || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">100% of income</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-expense-red/10 rounded-bl-full" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-expense-red" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-expense-red">
              {formatCurrency(summaryData?.totalExpenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{expenseRate}% of income</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-savings-blue/10 rounded-bl-full" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-savings-blue" />
              Total Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-savings-blue">
              {formatCurrency(summaryData?.totalSavings || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{savingsRate}% savings rate</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-20 h-20 ${(summaryData?.netAmount || 0) >= 0 ? 'bg-income-green/10' : 'bg-expense-red/10'} rounded-bl-full`} />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Net Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl md:text-2xl font-bold flex items-center gap-1 ${(summaryData?.netAmount || 0) >= 0 ? 'text-income-green' : 'text-expense-red'}`}>
              {(summaryData?.netAmount || 0) >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              {formatCurrency(Math.abs(summaryData?.netAmount || 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">After expenses & savings</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle>
              {selectedYear === 'all' ? 'Yearly Overview' : `Monthly Overview - ${selectedYear}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearlyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="income" fill="hsl(var(--income-green))" name="Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(var(--expense-red))" name="Expenses" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" fill="hsl(var(--savings-blue))" name="Savings" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            <CardTitle>Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Amount Line Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-primary" />
            <CardTitle>
              {selectedYear === 'all' ? 'Net Balance Trend - All Years' : `Net Balance Trend - ${selectedYear}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="net" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  name="Net Balance"
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Area Chart for cumulative */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stackId="1"
                  stroke="hsl(var(--income-green))" 
                  fill="hsl(var(--income-green) / 0.3)"
                  name="Income"
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stackId="2"
                  stroke="hsl(var(--expense-red))" 
                  fill="hsl(var(--expense-red) / 0.3)"
                  name="Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <p className="text-2xl font-bold text-income-green">
                {formatCurrency(summaryData?.totalIncome || 0)}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold text-expense-red">
                {formatCurrency(summaryData?.totalExpenses || 0)}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Saved</p>
              <p className="text-2xl font-bold text-savings-blue">
                {formatCurrency(summaryData?.totalSavings || 0)}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className={`text-2xl font-bold ${(summaryData?.inAccount || 0) >= 0 ? 'text-income-green' : 'text-expense-red'}`}>
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