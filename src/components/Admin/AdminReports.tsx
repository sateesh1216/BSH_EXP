import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, DollarSign, TrendingUp, TrendingDown, Wallet, Download, Users, RefreshCw } from 'lucide-react';
import { useAdminApi } from '@/hooks/useAdminApi';
import { useToast } from '@/hooks/use-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

interface UserBreakdown {
  user_id: string;
  name: string;
  email: string;
  income: number;
  expenses: number;
  savings: number;
  net: number;
}

interface ReportsData {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  netAmount: number;
  monthlyData: MonthlyData[];
  userBreakdown: UserBreakdown[];
  availableYears: number[];
  rawData: {
    income: any[];
    expenses: any[];
    savings: any[];
  };
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const AdminReports = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportsData | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const { getReportsData } = useAdminApi();
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getReportsData(selectedYear === 'all' ? undefined : selectedYear);
      setData(result);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load reports data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExportExcel = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['BSH Accounts - System-Wide Financial Report'],
      ['Generated on', new Date().toLocaleDateString()],
      ['Year', selectedYear === 'all' ? 'All Years' : selectedYear],
      [''],
      ['Summary'],
      ['Total Income', data.totalIncome],
      ['Total Expenses', data.totalExpenses],
      ['Total Savings', data.totalSavings],
      ['Net Amount', data.netAmount],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Monthly breakdown sheet
    const monthlySheet = XLSX.utils.json_to_sheet(data.monthlyData);
    XLSX.utils.book_append_sheet(wb, monthlySheet, 'Monthly Breakdown');

    // User breakdown sheet
    const userSheet = XLSX.utils.json_to_sheet(data.userBreakdown.map(u => ({
      Name: u.name,
      Email: u.email,
      Income: u.income,
      Expenses: u.expenses,
      Savings: u.savings,
      'Net Amount': u.net,
    })));
    XLSX.utils.book_append_sheet(wb, userSheet, 'User Breakdown');

    // Raw data sheets
    if (data.rawData.income.length > 0) {
      const incomeSheet = XLSX.utils.json_to_sheet(data.rawData.income);
      XLSX.utils.book_append_sheet(wb, incomeSheet, 'All Income');
    }
    if (data.rawData.expenses.length > 0) {
      const expensesSheet = XLSX.utils.json_to_sheet(data.rawData.expenses);
      XLSX.utils.book_append_sheet(wb, expensesSheet, 'All Expenses');
    }
    if (data.rawData.savings.length > 0) {
      const savingsSheet = XLSX.utils.json_to_sheet(data.rawData.savings);
      XLSX.utils.book_append_sheet(wb, savingsSheet, 'All Savings');
    }

    const fileName = `BSH_Reports_${selectedYear === 'all' ? 'AllYears' : selectedYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Export Successful",
      description: "Reports exported to Excel file",
    });
  };

  const pieChartData = data ? [
    { name: 'Expenses', value: data.totalExpenses },
    { name: 'Savings', value: data.totalSavings },
    { name: 'Net', value: Math.max(0, data.netAmount) },
  ].filter(d => d.value > 0) : [];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Reports</h2>
            <p className="text-muted-foreground">System-wide financial reports</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Reports</h2>
            <p className="text-muted-foreground">System-wide financial reports</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {data?.availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchData} size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleExportExcel} className="gap-2">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-effect border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold text-emerald-500">{formatCurrency(data?.totalIncome || 0)}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-500/10">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-rose-500">{formatCurrency(data?.totalExpenses || 0)}</p>
              </div>
              <div className="p-3 rounded-full bg-rose-500/10">
                <TrendingDown className="h-6 w-6 text-rose-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Savings</p>
                <p className="text-2xl font-bold text-blue-500">{formatCurrency(data?.totalSavings || 0)}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <Wallet className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Amount</p>
                <p className={`text-2xl font-bold ${(data?.netAmount || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatCurrency(data?.netAmount || 0)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends Chart */}
        <Card className="glass-effect border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data?.monthlyData || []}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${(v/1000)}k`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Area type="monotone" dataKey="income" stroke="hsl(var(--chart-1))" fill="url(#incomeGradient)" name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="hsl(var(--chart-2))" fill="url(#expensesGradient)" name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution Pie Chart */}
        <Card className="glass-effect border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Income Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Comparison Bar Chart */}
      <Card className="glass-effect border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Monthly Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data?.monthlyData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${(v/1000)}k`} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Legend />
              <Bar dataKey="income" name="Income" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="savings" name="Savings" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* User Breakdown Table */}
      <Card className="glass-effect border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            User-wise Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.userBreakdown && data.userBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Savings</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.userBreakdown.map(user => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-emerald-500 font-medium">
                        {formatCurrency(user.income)}
                      </TableCell>
                      <TableCell className="text-right text-rose-500 font-medium">
                        {formatCurrency(user.expenses)}
                      </TableCell>
                      <TableCell className="text-right text-blue-500 font-medium">
                        {formatCurrency(user.savings)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${user.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatCurrency(user.net)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No user data available for the selected period</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReports;
