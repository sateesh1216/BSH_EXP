import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAdminApi } from '@/hooks/useAdminApi';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, PiggyBank, Wallet, Calendar, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserFinancialDataProps {
  userId: string;
}

const UserFinancialData = ({ userId }: UserFinancialDataProps) => {
  const { getUserFinancialData } = useAdminApi();
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-financial', userId],
    queryFn: () => getUserFinancialData(userId),
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const months = [
    { value: '01', label: 'Jan' }, { value: '02', label: 'Feb' },
    { value: '03', label: 'Mar' }, { value: '04', label: 'Apr' },
    { value: '05', label: 'May' }, { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' }, { value: '08', label: 'Aug' },
    { value: '09', label: 'Sep' }, { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + 1 - i);

  // Filter data by selected year/month
  const filterByDate = (items: any[] | undefined) => {
    if (!items) return [];
    return items.filter((item: any) => {
      const date = new Date(item.date);
      if (selectedYear !== 'all' && date.getFullYear() !== parseInt(selectedYear)) return false;
      if (selectedMonth !== 'all' && (date.getMonth() + 1).toString().padStart(2, '0') !== selectedMonth) return false;
      return true;
    });
  };

  const filteredIncome = useMemo(() => filterByDate(data?.income), [data?.income, selectedYear, selectedMonth]);
  const filteredExpenses = useMemo(() => filterByDate(data?.expenses), [data?.expenses, selectedYear, selectedMonth]);
  const filteredSavings = useMemo(() => filterByDate(data?.savings), [data?.savings, selectedYear, selectedMonth]);

  const totalIncome = filteredIncome.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  const totalExpenses = filteredExpenses.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  const totalSavings = filteredSavings.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  const netBalance = totalIncome - totalExpenses;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const summaryCards = [
    {
      label: 'Total Income',
      value: totalIncome,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
      count: filteredIncome.length,
    },
    {
      label: 'Total Expenses',
      value: totalExpenses,
      icon: TrendingDown,
      color: 'text-expense-red',
      bgColor: 'bg-expense-red/10',
      count: filteredExpenses.length,
    },
    {
      label: 'Total Savings',
      value: totalSavings,
      icon: PiggyBank,
      color: 'text-expense-blue',
      bgColor: 'bg-expense-blue/10',
      count: filteredSavings.length,
    },
    {
      label: 'Net Balance',
      value: netBalance,
      icon: Wallet,
      color: netBalance >= 0 ? 'text-success' : 'text-expense-red',
      bgColor: netBalance >= 0 ? 'bg-success/10' : 'bg-expense-red/10',
      count: null,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Period Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Period</span>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="h-8 w-[110px] text-sm">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="h-8 w-[110px] text-sm">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(selectedYear !== 'all' || selectedMonth !== 'all') && (
          <button
            onClick={() => { setSelectedYear('all'); setSelectedMonth('all'); }}
            className="text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg shrink-0', card.bgColor)}>
                    <Icon className={cn('h-4 w-4', card.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{card.label}</p>
                    <p className={cn('text-lg font-bold truncate', card.color)}>
                      {formatCurrency(card.value)}
                    </p>
                    {card.count !== null && (
                      <p className="text-[11px] text-muted-foreground">{card.count} records</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      {/* Data Tabs */}
      <Tabs defaultValue="income" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-10">
          <TabsTrigger value="income" className="gap-1.5 text-sm">
            <TrendingUp className="h-3.5 w-3.5" />
            Income
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{filteredIncome.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5 text-sm">
            <TrendingDown className="h-3.5 w-3.5" />
            Expenses
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{filteredExpenses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="savings" className="gap-1.5 text-sm">
            <PiggyBank className="h-3.5 w-3.5" />
            Savings
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{filteredSavings.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income">
          <DataTable
            columns={['Date', 'Source', 'Amount']}
            rows={filteredIncome.map((item: any) => ({
              id: item.id,
              cells: [
                format(new Date(item.date), 'dd MMM yyyy'),
                item.source,
                formatCurrency(item.amount),
              ],
            }))}
            amountColorClass="text-success"
            emptyMessage="No income records found"
          />
        </TabsContent>

        <TabsContent value="expenses">
          <DataTable
            columns={['Date', 'Details', 'Payment', 'Amount']}
            rows={filteredExpenses.map((item: any) => ({
              id: item.id,
              cells: [
                format(new Date(item.date), 'dd MMM yyyy'),
                item.expense_details,
                item.payment_mode,
                formatCurrency(item.amount),
              ],
            }))}
            amountColorClass="text-expense-red"
            emptyMessage="No expense records found"
          />
        </TabsContent>

        <TabsContent value="savings">
          <DataTable
            columns={['Date', 'Details', 'Amount']}
            rows={filteredSavings.map((item: any) => ({
              id: item.id,
              cells: [
                format(new Date(item.date), 'dd MMM yyyy'),
                item.details,
                formatCurrency(item.amount),
              ],
            }))}
            amountColorClass="text-expense-blue"
            emptyMessage="No savings records found"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Reusable DataTable sub-component
interface DataTableProps {
  columns: string[];
  rows: { id: string; cells: string[] }[];
  amountColorClass: string;
  emptyMessage: string;
}

const DataTable = ({ columns, rows, amountColorClass, emptyMessage }: DataTableProps) => (
  <Card className="border-border/50">
    <CardContent className="p-0">
      <div className="max-h-[350px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              {columns.map((col, i) => (
                <TableHead
                  key={col}
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    i === columns.length - 1 && 'text-right'
                  )}
                >
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/20 transition-colors">
                {row.cells.map((cell, i) => (
                  <TableCell
                    key={i}
                    className={cn(
                      'text-sm',
                      i === row.cells.length - 1 && `text-right font-semibold ${amountColorClass}`
                    )}
                  >
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);

export default UserFinancialData;
