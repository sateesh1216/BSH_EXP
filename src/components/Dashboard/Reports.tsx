import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight,
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
} from 'lucide-react';

interface ReportsProps {
  selectedMonth: string;
  selectedYear: string;
}

const CHART_COLORS = {
  income: '#22c55e',
  expenses: '#ef4444',
  savings: '#3b82f6',
  net: '#8b5cf6',
};

const PIE_COLORS = ['#22c55e', '#ef4444', '#3b82f6'];

const Reports = ({ selectedMonth, selectedYear }: ReportsProps) => {
  const { user } = useAuth();

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
        supabase.from('income').select('amount, date').eq('user_id', user?.id).gte('date', startDate).lte('date', endDate),
        supabase.from('expenses').select('amount, date').eq('user_id', user?.id).gte('date', startDate).lte('date', endDate),
        supabase.from('savings').select('amount, date').eq('user_id', user?.id).gte('date', startDate).lte('date', endDate),
      ]);

      const periodData: { [key: string]: { income: number; expenses: number; savings: number } } = {};

      if (selectedYear === 'all') {
        const currentYear = new Date().getFullYear();
        for (let year = 2020; year <= currentYear; year++) {
          periodData[year.toString()] = { income: 0, expenses: 0, savings: 0 };
        }
        incomeResult.data?.forEach(item => { const y = format(new Date(item.date), 'yyyy'); if (periodData[y]) periodData[y].income += Number(item.amount); });
        expensesResult.data?.forEach(item => { const y = format(new Date(item.date), 'yyyy'); if (periodData[y]) periodData[y].expenses += Number(item.amount); });
        savingsResult.data?.forEach(item => { const y = format(new Date(item.date), 'yyyy'); if (periodData[y]) periodData[y].savings += Number(item.amount); });
        return Object.entries(periodData).map(([year, data]) => ({ month: year, ...data, net: data.income - data.expenses - data.savings }));
      } else {
        const year = parseInt(selectedYear);
        for (let i = 0; i < 12; i++) { periodData[String(i + 1).padStart(2, '0')] = { income: 0, expenses: 0, savings: 0 }; }
        incomeResult.data?.forEach(item => { const m = format(new Date(item.date), 'MM'); periodData[m].income += Number(item.amount); });
        expensesResult.data?.forEach(item => { const m = format(new Date(item.date), 'MM'); periodData[m].expenses += Number(item.amount); });
        savingsResult.data?.forEach(item => { const m = format(new Date(item.date), 'MM'); periodData[m].savings += Number(item.amount); });
        return Object.entries(periodData).map(([month, data]) => ({
          month: format(new Date(year, parseInt(month) - 1), 'MMM'),
          ...data,
          net: data.income - data.expenses - data.savings,
        }));
      }
    },
    enabled: !!user?.id,
  });

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
        supabase.from('income').select('amount').eq('user_id', user?.id).gte('date', startDate).lte('date', endDate),
        supabase.from('expenses').select('amount').eq('user_id', user?.id).gte('date', startDate).lte('date', endDate),
        supabase.from('savings').select('amount').eq('user_id', user?.id).gte('date', startDate).lte('date', endDate),
      ]);

      const totalIncome = incomeResult.data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const totalExpenses = expensesResult.data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const totalSavings = savingsResult.data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

      return { totalIncome, totalExpenses, totalSavings, netAmount: totalIncome - totalExpenses - totalSavings };
    },
    enabled: !!user?.id,
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getPeriodTitle = () => {
    if (selectedYear === 'all') return 'All Years Report';
    if (selectedMonth === 'all') return `Year ${selectedYear} Report`;
    return `${format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy')} Report`;
  };

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

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
    padding: '10px 14px',
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={tooltipStyle}>
        <p className="text-sm font-semibold text-foreground mb-1.5">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs flex items-center gap-2" style={{ color: entry.color }}>
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}: <span className="font-bold">{formatCurrency(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
        {[
          { label: 'Total Income', value: summaryData?.totalIncome || 0, icon: TrendingUp, color: CHART_COLORS.income, pct: '100%', pctLabel: 'of income' },
          { label: 'Total Expenses', value: summaryData?.totalExpenses || 0, icon: TrendingDown, color: CHART_COLORS.expenses, pct: `${expenseRate}%`, pctLabel: 'of income' },
          { label: 'Total Savings', value: summaryData?.totalSavings || 0, icon: PiggyBank, color: CHART_COLORS.savings, pct: `${savingsRate}%`, pctLabel: 'savings rate' },
          {
            label: 'Net Balance',
            value: Math.abs(summaryData?.netAmount || 0),
            icon: (summaryData?.netAmount || 0) >= 0 ? ArrowUpRight : ArrowDownRight,
            color: (summaryData?.netAmount || 0) >= 0 ? CHART_COLORS.income : CHART_COLORS.expenses,
            pct: '', pctLabel: 'After expenses & savings',
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 transition-opacity group-hover:opacity-20" style={{ backgroundColor: card.color }} />
              <div className="absolute bottom-0 left-0 w-1 h-full rounded-r-full" style={{ backgroundColor: card.color }} />
              <CardHeader className="pb-1 pt-4 pl-5">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" style={{ color: card.color }} />
                  {card.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="pl-5 pb-4">
                <div className="text-lg md:text-xl font-bold" style={{ color: card.color }}>
                  {formatCurrency(card.value)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{card.pct} {card.pctLabel}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">
              {selectedYear === 'all' ? 'Yearly Overview' : `Monthly Overview - ${selectedYear}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearlyData} barGap={4} barSize={selectedYear === 'all' ? 20 : undefined}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.income} stopOpacity={1} />
                    <stop offset="100%" stopColor={CHART_COLORS.income} stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.expenses} stopOpacity={1} />
                    <stop offset="100%" stopColor={CHART_COLORS.expenses} stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.savings} stopOpacity={1} />
                    <stop offset="100%" stopColor={CHART_COLORS.savings} stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="income" fill="url(#incomeGrad)" name="Income" radius={[6, 6, 0, 0]} animationDuration={800} />
                <Bar dataKey="expenses" fill="url(#expenseGrad)" name="Expenses" radius={[6, 6, 0, 0]} animationDuration={800} animationBegin={200} />
                <Bar dataKey="savings" fill="url(#savingsGrad)" name="Savings" radius={[6, 6, 0, 0]} animationDuration={800} animationBegin={400} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="hsl(var(--card))"
                  animationDuration={1000}
                  animationBegin={200}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} formatter={(value: string) => <span className="text-foreground">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Balance Trend */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <LineChartIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">
              {selectedYear === 'all' ? 'Net Balance Trend - All Years' : `Net Balance Trend - ${selectedYear}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={yearlyData}>
                <defs>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.net} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={CHART_COLORS.net} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke={CHART_COLORS.net}
                  strokeWidth={3}
                  name="Net Balance"
                  dot={{ fill: CHART_COLORS.net, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 7, fill: CHART_COLORS.net, stroke: 'hsl(var(--card))', strokeWidth: 3 }}
                  animationDuration={1200}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Income vs Expenses Area */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={yearlyData}>
                <defs>
                  <linearGradient id="areaIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.income} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_COLORS.income} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="areaExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.expenses} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_COLORS.expenses} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke={CHART_COLORS.income}
                  strokeWidth={2.5}
                  fill="url(#areaIncome)"
                  name="Income"
                  animationDuration={1000}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke={CHART_COLORS.expenses}
                  strokeWidth={2.5}
                  fill="url(#areaExpense)"
                  name="Expenses"
                  animationDuration={1000}
                  animationBegin={300}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary Footer */}
      <Card className="bg-gradient-to-r from-primary/5 via-primary/8 to-primary/5 border-primary/20 hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5 text-primary" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Total Earned', value: summaryData?.totalIncome || 0, color: CHART_COLORS.income },
              { label: 'Total Spent', value: summaryData?.totalExpenses || 0, color: CHART_COLORS.expenses },
              { label: 'Total Saved', value: summaryData?.totalSavings || 0, color: CHART_COLORS.savings },
              { label: 'Available Balance', value: summaryData?.netAmount || 0, color: (summaryData?.netAmount || 0) >= 0 ? CHART_COLORS.income : CHART_COLORS.expenses },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-xl font-bold" style={{ color: item.color }}>
                  {formatCurrency(item.value)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
