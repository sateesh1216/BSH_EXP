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
import SeoHead from '@/components/SeoHead';
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

  type DownloadType = 'income' | 'expenses' | 'savings';

  const handleDownloadFiltered = async (
    type: DownloadType,
    fileFormat: 'xlsx' | 'pdf',
    opts: { searchTerm: string; startDate?: Date; endDate?: Date }
  ) => {
    if (!user?.id) return;
    setDownloadingFiltered(true);
    try {
      let start: string;
      let end: string;
      if (opts.startDate || opts.endDate) {
        start = opts.startDate ? format(opts.startDate, 'yyyy-MM-dd') : '2020-01-01';
        end = opts.endDate ? format(opts.endDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      } else {
        const r = getDateRange();
        start = r.start;
        end = r.end;
      }

      let query = supabase
        .from(type)
        .select('*')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end);

      const term = opts.searchTerm.trim();
      if (term) {
        if (type === 'expenses') query = query.ilike('expense_details', `%${term}%`);
        else if (type === 'income') query = query.ilike('source', `%${term}%`);
        else if (type === 'savings') query = query.ilike('details', `%${term}%`);
      }

      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;

      if (!data || data.length === 0) {
        toast({ title: 'No results', description: `No ${type} match your filters.`, variant: 'destructive' });
        return;
      }

      const total = data.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      // Define columns per type
      let headers: string[];
      let rows: (string | number)[][];
      if (type === 'expenses') {
        headers = ['Date', 'Expense Details', 'Payment Mode', 'Amount'];
        rows = data.map((i: any) => [format(new Date(i.date), 'dd/MM/yyyy'), i.expense_details, i.payment_mode, Number(i.amount)]);
      } else if (type === 'income') {
        headers = ['Date', 'Source', 'Amount'];
        rows = data.map((i: any) => [format(new Date(i.date), 'dd/MM/yyyy'), i.source, Number(i.amount)]);
      } else {
        headers = ['Date', 'Details', 'Amount'];
        rows = data.map((i: any) => [format(new Date(i.date), 'dd/MM/yyyy'), i.details, Number(i.amount)]);
      }

      const parts: string[] = [];
      if (term) parts.push(term.replace(/[^a-z0-9]+/gi, '_'));
      if (opts.startDate || opts.endDate) parts.push(`${start}_to_${end}`);
      const suffix = parts.length ? parts.join('_') : 'all';
      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
      const baseFilename = `${typeLabel}_${suffix}_${format(new Date(), 'yyyy-MM-dd')}`;

      if (fileFormat === 'xlsx') {
        const objectRows = rows.map((r) => Object.fromEntries(headers.map((h, idx) => [h, r[idx]])));
        const totalRow: any = Object.fromEntries(headers.map((h) => [h, '']));
        totalRow[headers[headers.length - 2]] = 'TOTAL';
        totalRow[headers[headers.length - 1]] = total;
        objectRows.push(totalRow);
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(objectRows);
        XLSX.utils.book_append_sheet(workbook, sheet, `Filtered ${typeLabel}`);
        XLSX.writeFile(workbook, `${baseFilename}.xlsx`);
      } else {
        // PDF-safe currency: jsPDF's built-in fonts don't render the ₹ glyph
        // (renders as a black box). Use "Rs." with Indian digit grouping.
        const pdfCurrency = (n: number) => {
          const sign = n < 0 ? '-' : '';
          const formatted = new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(Math.abs(n));
          return `${sign}Rs. ${formatted}`;
        };

        const isWide = type === 'expenses';
        const doc = new jsPDF({
          orientation: isWide ? 'landscape' : 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const marginX = 14;

        // Brand palette
        const BRAND: [number, number, number] = [15, 23, 42];      // slate-900
        const ACCENT: [number, number, number] = [37, 99, 235];    // blue-600
        const SOFT: [number, number, number] = [241, 245, 249];    // slate-100
        const INK: [number, number, number] = [30, 41, 59];        // slate-800
        const MUTED: [number, number, number] = [100, 116, 139];   // slate-500

        // Header band
        doc.setFillColor(...BRAND);
        doc.rect(0, 0, pageWidth, 26, 'F');
        doc.setFillColor(...ACCENT);
        doc.rect(0, 26, pageWidth, 1.2, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('BSH Accounts', marginX, 13);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`${typeLabel} Report`, marginX, 20);
        doc.setFontSize(9);
        doc.text(
          `Generated ${format(new Date(), 'dd MMM yyyy, HH:mm')}`,
          pageWidth - marginX,
          20,
          { align: 'right' }
        );

        // Filter summary section — stronger typography, clearer hierarchy
        const summaryY = 34;
        const summaryTitleY = summaryY;
        doc.setTextColor(...INK);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Filter Summary', marginX, summaryTitleY);

        // Horizontal rule under title
        doc.setDrawColor(...ACCENT);
        doc.setLineWidth(0.6);
        doc.line(marginX, summaryTitleY + 2, marginX + 48, summaryTitleY + 2);

        const row1Y = summaryTitleY + 10;
        const row2Y = row1Y + 10;
        const col1X = marginX;
        const col2X = marginX + (pageWidth - marginX * 2) * 0.38;
        const col3X = marginX + (pageWidth - marginX * 2) * 0.72;

        const drawSummaryItem = (x: number, y: number, label: string, value: string) => {
          doc.setFontSize(8.5);
          doc.setTextColor(...MUTED);
          doc.setFont('helvetica', 'normal');
          doc.text(label, x, y);
          doc.setFontSize(11);
          doc.setTextColor(...INK);
          doc.setFont('helvetica', 'bold');
          doc.text(value, x, y + 5.5);
        };

        drawSummaryItem(col1X, row1Y, 'DATE RANGE', `${format(new Date(start), 'dd MMM yyyy')}  –  ${format(new Date(end), 'dd MMM yyyy')}`);
        drawSummaryItem(col2X, row1Y, 'RECORDS', `${data.length} ${typeLabel}`);
        if (term) {
          drawSummaryItem(col3X, row1Y, 'SEARCH TERM', `"${term}"`);
        }

        // Total banner — bolder, full-width
        const bannerY = term ? row2Y + 6 : row1Y + 14;
        const bannerH = 14;
        doc.setFillColor(...ACCENT);
        doc.roundedRect(marginX, bannerY, pageWidth - marginX * 2, bannerH, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`Total ${typeLabel}`, marginX + 6, bannerY + 9);
        doc.setFontSize(14);
        doc.text(pdfCurrency(total), pageWidth - marginX - 6, bannerY + 9, { align: 'right' });

        const tableStartY = bannerY + bannerH + 5;

        // Column widths
        const usable = pageWidth - marginX * 2;
        let columnStyles: Record<number, any> = {};
        if (type === 'expenses') {
          const dateW = 26;
          const modeW = 32;
          const amtW = 38;
          columnStyles = {
            0: { cellWidth: dateW, halign: 'left' },
            1: { cellWidth: usable - dateW - modeW - amtW, halign: 'left' },
            2: { cellWidth: modeW, halign: 'center' },
            3: { cellWidth: amtW, halign: 'right', font: 'helvetica', fontStyle: 'bold' },
          };
        } else {
          const dateW = 30;
          const amtW = 42;
          columnStyles = {
            0: { cellWidth: dateW, halign: 'left' },
            1: { cellWidth: usable - dateW - amtW, halign: 'left' },
            2: { cellWidth: amtW, halign: 'right', fontStyle: 'bold' },
          };
        }

        autoTable(doc, {
          head: [headers],
          body: rows.map((r) =>
            r.map((c, idx) => (idx === r.length - 1 ? pdfCurrency(Number(c)) : String(c ?? '')))
          ),
          startY: tableStartY,
          margin: { left: marginX, right: marginX, bottom: 16 },
          tableLineColor: [226, 232, 240],
          tableLineWidth: 0.1,
          styles: {
            fontSize: 9,
            cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
            overflow: 'linebreak',
            valign: 'middle',
            textColor: INK,
            lineColor: [226, 232, 240],
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: BRAND,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 3.5,
            fontSize: 9.5,
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles,
          foot: [headers.map((_, idx) =>
            idx === headers.length - 2
              ? 'TOTAL'
              : idx === headers.length - 1
                ? pdfCurrency(total)
                : ''
          )],
          footStyles: {
            fillColor: ACCENT,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'right',
            fontSize: 10,
            cellPadding: 3.5,
          },
          didDrawPage: () => {
            doc.setFontSize(8);
            doc.setTextColor(...MUTED);
            doc.text('BSH Accounts - Confidential', marginX, pageHeight - 8);
            doc.text(
              `Page ${doc.getNumberOfPages()}`,
              pageWidth - marginX,
              pageHeight - 8,
              { align: 'right' }
            );
          },
        });
        doc.save(`${baseFilename}.pdf`);
      }

      toast({ title: 'Download complete', description: `${data.length} ${type} record(s) exported.` });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Download failed', description: err.message || 'Could not export results.', variant: 'destructive' });
    } finally {
      setDownloadingFiltered(false);
    }
  };

  const renderDownloadMenu = (type: DownloadType, opts: { searchTerm: string; startDate?: Date; endDate?: Date }) => {
    const active = !!opts.searchTerm.trim() || !!opts.startDate || !!opts.endDate;
    if (!active) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={downloadingFiltered} variant="outline" size="sm" className="ml-auto gap-2">
            <Download className="h-4 w-4" />
            {downloadingFiltered ? 'Exporting...' : 'Download Results'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleDownloadFiltered(type, 'pdf', opts)}>
            Download as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownloadFiltered(type, 'xlsx', opts)}>
            Download as Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Search income..." value={incomeSearchTerm} onChange={(e) => setIncomeSearchTerm(e.target.value)} className="pl-10 w-[200px]" />
              </div>
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
              {renderDownloadMenu('income', { searchTerm: incomeSearchTerm, startDate: incomeStartDate, endDate: incomeEndDate })}
            </div>
            <EditableDataTable type="income" selectedMonth={selectedMonth} selectedYear={selectedYear} searchTerm={incomeSearchTerm} startDate={incomeStartDate} endDate={incomeEndDate} />
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
              {renderDownloadMenu('expenses', { searchTerm: expenseSearchTerm, startDate: expenseStartDate, endDate: expenseEndDate })}
            </div>
            <EditableDataTable type="expenses" selectedMonth={selectedMonth} selectedYear={selectedYear} searchTerm={expenseSearchTerm} startDate={expenseStartDate} endDate={expenseEndDate} />
          </div>
        );
      case 'savings':
        return (
          <div className="space-y-6">
            <SavingsForm />
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Search savings..." value={savingsSearchTerm} onChange={(e) => setSavingsSearchTerm(e.target.value)} className="pl-10 w-[200px]" />
              </div>
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
              {renderDownloadMenu('savings', { searchTerm: savingsSearchTerm, startDate: savingsStartDate, endDate: savingsEndDate })}
            </div>
            <EditableDataTable type="savings" selectedMonth={selectedMonth} selectedYear={selectedYear} searchTerm={savingsSearchTerm} startDate={savingsStartDate} endDate={savingsEndDate} />
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
      <SeoHead
        title="Dashboard — BSH Accounts"
        description="Your personal finance dashboard for income, expenses, savings, hand loans, and monthly reports."
        path="/"
      />
      {/* Header */}
      <header className="border-b border-border/40 sticky top-0 z-50 backdrop-blur-xl bg-card/80 supports-[backdrop-filter]:bg-card/60">
        <div className="px-3 sm:px-6 lg:px-8 h-14 sm:h-[65px]">
          <div className="flex justify-between items-center gap-2 h-full">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Mobile Menu */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden shrink-0 -ml-1 active:scale-95">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[85vw] max-w-sm">
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
              <div className="p-1.5 sm:p-2 bg-gradient-primary rounded-xl shadow-glow shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-gradient truncate">
                  <span className="sm:hidden">BSH Accounts</span>
                  <span className="hidden sm:inline">BSH Accounts — Personal Finance Dashboard</span>
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Financial Management</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <span className="text-sm text-muted-foreground hidden xl:block">
                Welcome, <span className="font-medium text-foreground">{user?.email?.split('@')[0]}</span>
              </span>
              <div className="hidden sm:block">
                <ExportPdfReport selectedMonth={selectedMonth} selectedYear={selectedYear} />
              </div>
              <Button variant="ghost" onClick={() => window.location.reload()} size="icon" className="sm:hidden h-9 w-9 active:scale-95">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()} size="sm" className="hidden sm:inline-flex border-border/40 hover:bg-muted/60">
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button variant="ghost" onClick={signOut} size="icon" className="sm:hidden h-9 w-9 active:scale-95">
                <LogOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={signOut} size="sm" className="hidden sm:inline-flex border-border/40 hover:bg-muted/60">
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
        <main className="flex-1 min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0 overflow-auto scroll-smooth">
          <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Reminders */}
            <UpcomingReminders />

            {/* Summary Cards */}
            <MonthlySummaryCards selectedMonth={selectedMonth} selectedYear={selectedYear} />

            {/* Section Header */}
            {currentMeta && (
              <div className="flex items-center gap-3 pb-1 lg:pb-3 animate-fade-in">
                <div className="p-2 rounded-xl bg-primary/10 transition-colors duration-300 shrink-0">
                  {SectionIcon && <SectionIcon className="h-5 w-5 text-primary" />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">{currentMeta.label}</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{currentMeta.description}</p>
                </div>
                <div className="ml-auto sm:hidden">
                  <ExportPdfReport selectedMonth={selectedMonth} selectedYear={selectedYear} />
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
