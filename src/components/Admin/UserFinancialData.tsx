import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminApi } from '@/hooks/useAdminApi';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { format, differenceInDays } from 'date-fns';
import { TrendingUp, TrendingDown, PiggyBank, Wallet, Calendar, Download, HandCoins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface UserFinancialDataProps {
  userId: string;
  userName?: string;
}

const UserFinancialData = ({ userId, userName }: UserFinancialDataProps) => {
  const { getUserFinancialData } = useAdminApi();
  const { toast } = useToast();
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
  const filteredHandLoans = useMemo(() => filterByDate(data?.hand_loans), [data?.hand_loans, selectedYear, selectedMonth]);

  const repayments = data?.loan_repayments || [];

  const getRepaymentTotal = (loanId: string) =>
    repayments.filter((r: any) => r.loan_id === loanId).reduce((sum: number, r: any) => sum + Number(r.amount), 0);

  const getRemainingBalance = (loan: any) => Number(loan.amount) - getRepaymentTotal(loan.id);

  const calculateInterest = (loan: any) => {
    const remaining = getRemainingBalance(loan);
    if (remaining <= 0 || !loan.interest_rate) return 0;
    const days = Math.max(differenceInDays(new Date(), new Date(loan.date)), 1);
    return (remaining * Number(loan.interest_rate) * days) / 365 / 100;
  };

  const totalIncome = filteredIncome.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  const totalExpenses = filteredExpenses.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  const totalSavings = filteredSavings.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  const totalLoansGiven = filteredHandLoans.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  const totalRepaid = filteredHandLoans.reduce((sum: number, loan: any) => sum + getRepaymentTotal(loan.id), 0);
  const totalRemaining = totalLoansGiven - totalRepaid;
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
    { label: 'Total Income', value: totalIncome, icon: TrendingUp, color: 'text-success', bgColor: 'bg-success/10', count: filteredIncome.length },
    { label: 'Total Expenses', value: totalExpenses, icon: TrendingDown, color: 'text-expense-red', bgColor: 'bg-expense-red/10', count: filteredExpenses.length },
    { label: 'Total Savings', value: totalSavings, icon: PiggyBank, color: 'text-expense-blue', bgColor: 'bg-expense-blue/10', count: filteredSavings.length },
    { label: 'Net Balance', value: netBalance, icon: Wallet, color: netBalance >= 0 ? 'text-success' : 'text-expense-red', bgColor: netBalance >= 0 ? 'bg-success/10' : 'bg-expense-red/10', count: null },
    { label: 'Loans Given', value: totalLoansGiven, icon: HandCoins, color: 'text-orange-500', bgColor: 'bg-orange-500/10', count: filteredHandLoans.length },
    { label: 'Remaining Balance', value: totalRemaining, icon: HandCoins, color: 'text-amber-500', bgColor: 'bg-amber-500/10', count: null },
  ];

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const summaryData = [
      ['Summary'],
      ['Total Income', totalIncome],
      ['Total Expenses', totalExpenses],
      ['Total Savings', totalSavings],
      ['Net Balance', netBalance],
      ['Loans Given', totalLoansGiven],
      ['Total Repaid', totalRepaid],
      ['Remaining Balance', totalRemaining],
      [],
      ['Period', selectedYear === 'all' ? 'All Years' : selectedYear, selectedMonth === 'all' ? 'All Months' : months.find(m => m.value === selectedMonth)?.label || ''],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

    if (filteredIncome.length > 0) {
      const rows = filteredIncome.map((item: any) => ({ Date: format(new Date(item.date), 'dd/MM/yyyy'), Source: item.source, Amount: Number(item.amount) }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Income');
    }
    if (filteredExpenses.length > 0) {
      const rows = filteredExpenses.map((item: any) => ({ Date: format(new Date(item.date), 'dd/MM/yyyy'), Details: item.expense_details, 'Payment Mode': item.payment_mode, Amount: Number(item.amount) }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Expenses');
    }
    if (filteredSavings.length > 0) {
      const rows = filteredSavings.map((item: any) => ({ Date: format(new Date(item.date), 'dd/MM/yyyy'), Details: item.details, Amount: Number(item.amount) }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Savings');
    }
    if (filteredHandLoans.length > 0) {
      const rows = filteredHandLoans.map((loan: any) => ({
        Date: format(new Date(loan.date), 'dd/MM/yyyy'),
        Borrower: loan.borrower_name,
        Amount: Number(loan.amount),
        'Interest Rate': `${loan.interest_rate}%`,
        Repaid: getRepaymentTotal(loan.id),
        Remaining: getRemainingBalance(loan),
        Interest: Math.round(calculateInterest(loan) * 100) / 100,
        Status: loan.status,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Hand Loans');
    }

    const filename = `${(userName || 'user').replace(/\s+/g, '_')}_financial_data.xlsx`;
    XLSX.writeFile(wb, filename);
    toast({ title: 'Excel exported successfully' });
  };

  return (
    <div className="space-y-5">
      {/* Period Filter + Export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
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
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
        <TabsList className="grid w-full grid-cols-4 h-10">
          <TabsTrigger value="income" className="gap-1.5 text-sm">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Income</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{filteredIncome.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5 text-sm">
            <TrendingDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Expenses</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{filteredExpenses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="savings" className="gap-1.5 text-sm">
            <PiggyBank className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Savings</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{filteredSavings.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="handloans" className="gap-1.5 text-sm">
            <HandCoins className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Loans</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{filteredHandLoans.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income">
          <DataTable
            columns={['Date', 'Source', 'Amount']}
            rows={filteredIncome.map((item: any) => ({
              id: item.id,
              cells: [format(new Date(item.date), 'dd MMM yyyy'), item.source, formatCurrency(item.amount)],
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
              cells: [format(new Date(item.date), 'dd MMM yyyy'), item.expense_details, item.payment_mode, formatCurrency(item.amount)],
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
              cells: [format(new Date(item.date), 'dd MMM yyyy'), item.details, formatCurrency(item.amount)],
            }))}
            amountColorClass="text-expense-blue"
            emptyMessage="No savings records found"
          />
        </TabsContent>

        <TabsContent value="handloans">
          <DataTable
            columns={['Date', 'Borrower', 'Amount', 'Repaid', 'Remaining', 'Interest', 'Status']}
            rows={filteredHandLoans.map((loan: any) => ({
              id: loan.id,
              cells: [
                format(new Date(loan.date), 'dd MMM yyyy'),
                loan.borrower_name,
                formatCurrency(loan.amount),
                formatCurrency(getRepaymentTotal(loan.id)),
                formatCurrency(getRemainingBalance(loan)),
                formatCurrency(Math.round(calculateInterest(loan) * 100) / 100),
                loan.status,
              ],
            }))}
            amountColorClass="text-orange-500"
            emptyMessage="No hand loan records found"
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
