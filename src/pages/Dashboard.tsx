import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, TrendingUp, Search, CalendarIcon, X, Menu, RefreshCw, TrendingDown, PiggyBank, BarChart3, Download, Upload, Trash2, HandCoins } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Sidebar from '@/components/Dashboard/Sidebar';
import MonthlySummaryCards from '@/components/Dashboard/MonthlySummaryCards';
import IncomeForm from '@/components/Dashboard/IncomeForm';
import ExpenseForm from '@/components/Dashboard/ExpenseForm';
import SavingsForm from '@/components/Dashboard/SavingsForm';
import EditableDataTable from '@/components/Dashboard/EditableDataTable';
import Reports from '@/components/Dashboard/Reports';
import DownloadData from '@/components/Dashboard/DownloadData';
import DataUpload from '@/components/Dashboard/DataUpload';
import DeleteData from '@/components/Dashboard/DeleteData';
import HandLoanForm from '@/components/Dashboard/HandLoanForm';
import QuickAddExpense from '@/components/Dashboard/QuickAddExpense';
import UpcomingReminders from '@/components/Dashboard/UpcomingReminders';
import ExportPdfReport from '@/components/Dashboard/ExportPdfReport';
import BottomNav from '@/components/Dashboard/BottomNav';

const sectionMeta: Record<string, { label: string; icon: any; description: string }> = {
  income: { label: 'Income', icon: TrendingUp, description: 'Track and manage your income sources' },
  expenses: { label: 'Expenses', icon: TrendingDown, description: 'Monitor and categorize your spending' },
  savings: { label: 'Savings', icon: PiggyBank, description: 'Track your savings and investments' },
  handloan: { label: 'Hand Loan', icon: HandCoins, description: 'Track hand loans and calculate interest' },
  reports: { label: 'Reports', icon: BarChart3, description: 'Analyze your financial data' },
  download: { label: 'Download Data', icon: Download, description: 'Export your financial records' },
  upload: { label: 'Upload Data', icon: Upload, description: 'Import data from spreadsheets' },
  delete: { label: 'Delete Data', icon: Trash2, description: 'Remove financial records' },
};

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState('income');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
  const [expenseSearchTerm, setExpenseSearchTerm] = useState('');
  const [expenseStartDate, setExpenseStartDate] = useState<Date | undefined>(undefined);
  const [expenseEndDate, setExpenseEndDate] = useState<Date | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [incomeStartDate, setIncomeStartDate] = useState<Date | undefined>(undefined);
  const [incomeEndDate, setIncomeEndDate] = useState<Date | undefined>(undefined);
  const [incomeSearchTerm, setIncomeSearchTerm] = useState('');
  const [savingsStartDate, setSavingsStartDate] = useState<Date | undefined>(undefined);
  const [savingsEndDate, setSavingsEndDate] = useState<Date | undefined>(undefined);
  const [savingsSearchTerm, setSavingsSearchTerm] = useState('');

  // Keyboard shortcuts: Alt+1 (Income), Alt+2 (Expenses), Alt+3 (Savings), Alt+4 (Reports)
  useKeyboardNavigation(setActiveSection);

  const getDateRange = () => {
    if (selectedYear === 'all') {
      return { start: '2020-01-01', end: format(new Date(), 'yyyy-MM-dd') };
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

  const { data: filteredExpensesTotal } = useQuery({
    queryKey: ['filtered-expenses-total', selectedYear, selectedMonth, expenseSearchTerm],
    queryFn: async () => {
      if (!expenseSearchTerm.trim()) return 0;
      const { start, end } = getDateRange();
      let query = supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user?.id)
        .gte('date', start)
        .lte('date', end)
        .ilike('expense_details', `%${expenseSearchTerm.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
    },
    enabled: !!user?.id && !!expenseSearchTerm.trim(),
  });

  const { data: dateRangeExpensesTotal } = useQuery({
    queryKey: ['date-range-expenses-total', expenseStartDate?.toISOString(), expenseEndDate?.toISOString(), expenseSearchTerm],
    queryFn: async () => {
      if (!expenseStartDate && !expenseEndDate) return 0;
      const start = expenseStartDate ? format(expenseStartDate, 'yyyy-MM-dd') : '2020-01-01';
      const end = expenseEndDate ? format(expenseEndDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      let query = supabase.from('expenses').select('amount').eq('user_id', user?.id).gte('date', start).lte('date', end);
      if (expenseSearchTerm.trim()) {
        query = query.ilike('expense_details', `%${expenseSearchTerm.trim()}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
    },
    enabled: !!user?.id && (!!expenseStartDate || !!expenseEndDate),
  });

  const { data: dateRangeIncomeTotal } = useQuery({
    queryKey: ['date-range-income-total', incomeStartDate?.toISOString(), incomeEndDate?.toISOString()],
    queryFn: async () => {
      if (!incomeStartDate && !incomeEndDate) return 0;
      const start = incomeStartDate ? format(incomeStartDate, 'yyyy-MM-dd') : '2020-01-01';
      const end = incomeEndDate ? format(incomeEndDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase.from('income').select('amount').eq('user_id', user?.id).gte('date', start).lte('date', end);
      if (error) throw error;
      return data?.reduce((sum, income) => sum + Number(income.amount), 0) || 0;
    },
    enabled: !!user?.id && (!!incomeStartDate || !!incomeEndDate),
  });

  const { data: dateRangeSavingsTotal } = useQuery({
    queryKey: ['date-range-savings-total', savingsStartDate?.toISOString(), savingsEndDate?.toISOString()],
    queryFn: async () => {
      if (!savingsStartDate && !savingsEndDate) return 0;
      const start = savingsStartDate ? format(savingsStartDate, 'yyyy-MM-dd') : '2020-01-01';
      const end = savingsEndDate ? format(savingsEndDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase.from('savings').select('amount').eq('user_id', user?.id).gte('date', start).lte('date', end);
      if (error) throw error;
      return data?.reduce((sum, saving) => sum + Number(saving.amount), 0) || 0;
    },
    enabled: !!user?.id && (!!savingsStartDate || !!savingsEndDate),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const { toast } = useToast();
  const [downloadingFiltered, setDownloadingFiltered] = useState(false);

  const handleDownloadFilteredExpenses = async () => {
    if (!user?.id) return;
    setDownloadingFiltered(true);
    try {
      let start: string;
      let end: string;
      if (expenseStartDate || expenseEndDate) {
        start = expenseStartDate ? format(expenseStartDate, 'yyyy-MM-dd') : '2020-01-01';
        end = expenseEndDate ? format(expenseEndDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      } else {
        const r = getDateRange();
        start = r.start;
        end = r.end;
      }

      let query = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end);

      if (expenseSearchTerm.trim()) {
        query = query.ilike('expense_details', `%${expenseSearchTerm.trim()}%`);
      }

      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;

      if (!data || data.length === 0) {
        toast({ title: 'No results', description: 'No expenses match your filters.', variant: 'destructive' });
        return;
      }

      const total = data.reduce((sum, e) => sum + Number(e.amount), 0);
      const rows = data.map((item) => ({
        Date: format(new Date(item.date), 'dd/MM/yyyy'),
        'Expense Details': item.expense_details,
        'Payment Mode': item.payment_mode,
        Amount: Number(item.amount),
      }));
      rows.push({ Date: '', 'Expense Details': '', 'Payment Mode': 'TOTAL', Amount: total } as any);

      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, sheet, 'Filtered Expenses');

      const parts: string[] = [];
      if (expenseSearchTerm.trim()) parts.push(expenseSearchTerm.trim().replace(/[^a-z0-9]+/gi, '_'));
      if (expenseStartDate || expenseEndDate) {
        parts.push(`${start}_to_${end}`);
      }
      const suffix = parts.length ? parts.join('_') : 'all';
      const filename = `Expenses_${suffix}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast({ title: 'Download complete', description: `${data.length} expense(s) exported.` });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Download failed', description: err.message || 'Could not export results.', variant: 'destructive' });
    } finally {
      setDownloadingFiltered(false);
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'income':
        return (
          <div className="space-y-6">
            <IncomeForm />
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !incomeStartDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {incomeStartDate ? format(incomeStartDate, "dd/MM/yyyy") : "From Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={incomeStartDate} onSelect={setIncomeStartDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !incomeEndDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {incomeEndDate ? format(incomeEndDate, "dd/MM/yyyy") : "To Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={incomeEndDate} onSelect={setIncomeEndDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                {(incomeStartDate || incomeEndDate) && (
                  <Button variant="ghost" size="icon" onClick={() => { setIncomeStartDate(undefined); setIncomeEndDate(undefined); }} className="h-9 w-9">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {(incomeStartDate || incomeEndDate) && dateRangeIncomeTotal !== undefined && (
                <div className="flex items-center gap-2 px-3 py-2 bg-card border rounded-lg">
                  <span className="text-sm text-muted-foreground">
                    {incomeStartDate && incomeEndDate
                      ? `${format(incomeStartDate, 'dd/MM/yyyy')} - ${format(incomeEndDate, 'dd/MM/yyyy')}`
                      : incomeStartDate ? `From ${format(incomeStartDate, 'dd/MM/yyyy')}` : `To ${format(incomeEndDate!, 'dd/MM/yyyy')}`}:
                  </span>
                  <span className="text-sm font-semibold text-income-green">{formatCurrency(dateRangeIncomeTotal)}</span>
                </div>
              )}
            </div>
            <EditableDataTable type="income" selectedMonth={selectedMonth} selectedYear={selectedYear} startDate={incomeStartDate} endDate={incomeEndDate} />
          </div>
        );
      case 'expenses':
        return (
          <div className="space-y-6">
            <ExpenseForm />
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Search expenses..." value={expenseSearchTerm} onChange={(e) => setExpenseSearchTerm(e.target.value)} className="pl-10 w-[200px]" />
              </div>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !expenseStartDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expenseStartDate ? format(expenseStartDate, "dd/MM/yyyy") : "From Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={expenseStartDate} onSelect={setExpenseStartDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !expenseEndDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expenseEndDate ? format(expenseEndDate, "dd/MM/yyyy") : "To Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={expenseEndDate} onSelect={setExpenseEndDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                {(expenseStartDate || expenseEndDate) && (
                  <Button variant="ghost" size="icon" onClick={() => { setExpenseStartDate(undefined); setExpenseEndDate(undefined); }} className="h-9 w-9">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {(expenseStartDate || expenseEndDate) && dateRangeExpensesTotal !== undefined && (
                <div className="flex items-center gap-2 px-3 py-2 bg-card border rounded-lg">
                  <span className="text-sm text-muted-foreground">
                    {expenseStartDate && expenseEndDate
                      ? `${format(expenseStartDate, 'dd/MM/yyyy')} - ${format(expenseEndDate, 'dd/MM/yyyy')}`
                      : expenseStartDate ? `From ${format(expenseStartDate, 'dd/MM/yyyy')}` : `To ${format(expenseEndDate!, 'dd/MM/yyyy')}`}:
                  </span>
                  <span className="text-sm font-semibold text-expense-red">{formatCurrency(dateRangeExpensesTotal)}</span>
                </div>
              )}
              {expenseSearchTerm.trim() && !expenseStartDate && !expenseEndDate && filteredExpensesTotal !== undefined && (
                <div className="flex items-center gap-2 px-3 py-2 bg-card border rounded-lg">
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <span className="text-sm font-semibold text-expense-red">{formatCurrency(filteredExpensesTotal)}</span>
                </div>
              )}
              {(expenseSearchTerm.trim() || expenseStartDate || expenseEndDate) && (
                <Button
                  onClick={handleDownloadFilteredExpenses}
                  disabled={downloadingFiltered}
                  variant="outline"
                  size="sm"
                  className="ml-auto gap-2"
                >
                  <Download className="h-4 w-4" />
                  {downloadingFiltered ? 'Exporting...' : 'Download Results'}
                </Button>
              )}
            </div>
            <EditableDataTable type="expenses" selectedMonth={selectedMonth} selectedYear={selectedYear} searchTerm={expenseSearchTerm} startDate={expenseStartDate} endDate={expenseEndDate} />
          </div>
        );
      case 'savings':
        return (
          <div className="space-y-6">
            <SavingsForm />
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !savingsStartDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {savingsStartDate ? format(savingsStartDate, "dd/MM/yyyy") : "From Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={savingsStartDate} onSelect={setSavingsStartDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !savingsEndDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {savingsEndDate ? format(savingsEndDate, "dd/MM/yyyy") : "To Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={savingsEndDate} onSelect={setSavingsEndDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                {(savingsStartDate || savingsEndDate) && (
                  <Button variant="ghost" size="icon" onClick={() => { setSavingsStartDate(undefined); setSavingsEndDate(undefined); }} className="h-9 w-9">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {(savingsStartDate || savingsEndDate) && dateRangeSavingsTotal !== undefined && (
                <div className="flex items-center gap-2 px-3 py-2 bg-card border rounded-lg">
                  <span className="text-sm text-muted-foreground">
                    {savingsStartDate && savingsEndDate
                      ? `${format(savingsStartDate, 'dd/MM/yyyy')} - ${format(savingsEndDate, 'dd/MM/yyyy')}`
                      : savingsStartDate ? `From ${format(savingsStartDate, 'dd/MM/yyyy')}` : `To ${format(savingsEndDate!, 'dd/MM/yyyy')}`}:
                  </span>
                  <span className="text-sm font-semibold text-expense-blue">{formatCurrency(dateRangeSavingsTotal)}</span>
                </div>
              )}
            </div>
            <EditableDataTable type="savings" selectedMonth={selectedMonth} selectedYear={selectedYear} startDate={savingsStartDate} endDate={savingsEndDate} />
          </div>
        );
      case 'handloan':
        return <HandLoanForm />;
      case 'reports':
        return <Reports selectedMonth={selectedMonth} selectedYear={selectedYear} />;
      case 'download':
        return <DownloadData />;
      case 'upload':
        return <DataUpload />;
      case 'delete':
        return <DeleteData />;
      default:
        return null;
    }
  };

  const currentMeta = sectionMeta[activeSection];
  const SectionIcon = currentMeta?.icon;

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header className="border-b border-border/40 sticky top-0 z-50 backdrop-blur-md bg-card/80 h-[65px]">
        <div className="px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile Menu */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-80">
                  <Sidebar
                    activeSection={activeSection}
                    setActiveSection={(section) => { setActiveSection(section); setSidebarOpen(false); }}
                    selectedMonth={selectedMonth}
                    setSelectedMonth={setSelectedMonth}
                    selectedYear={selectedYear}
                    setSelectedYear={setSelectedYear}
                  />
                </SheetContent>
              </Sheet>
              <div className="p-1.5 sm:p-2 bg-gradient-primary rounded-xl shadow-glow">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gradient">BSH Accounts</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Financial Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-sm text-muted-foreground hidden xl:block">
                Welcome, <span className="font-medium text-foreground">{user?.email?.split('@')[0]}</span>
              </span>
              <ExportPdfReport selectedMonth={selectedMonth} selectedYear={selectedYear} />
              <Button variant="outline" onClick={() => window.location.reload()} size="sm" className="border-border/40 hover:bg-muted/60">
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button variant="outline" onClick={signOut} size="sm" className="border-border/40 hover:bg-muted/60">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex">
        {/* Sidebar - Desktop only */}
        <div className="hidden lg:block">
          <Sidebar
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0 pb-20 lg:pb-0 overflow-auto scroll-smooth">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Reminders */}
            <UpcomingReminders />

            {/* Summary Cards */}
            <MonthlySummaryCards selectedMonth={selectedMonth} selectedYear={selectedYear} />

            {/* Section Header - Desktop */}
            {currentMeta && (
              <div className="hidden lg:flex items-center gap-3 pb-3 animate-fade-in">
                <div className="p-2 rounded-xl bg-primary/10 transition-colors duration-300">
                  {SectionIcon && <SectionIcon className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{currentMeta.label}</h2>
                  <p className="text-sm text-muted-foreground">{currentMeta.description}</p>
                </div>
              </div>
            )}

            {/* Dynamic Content */}
            <div className="animate-fade-in">{renderContent()}</div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav activeSection={activeSection} setActiveSection={setActiveSection} />

      {/* Quick Add */}
      <QuickAddExpense />
    </div>
  );
};

export default Dashboard;
