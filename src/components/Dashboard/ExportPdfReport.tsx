import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportPdfReportProps {
  selectedMonth: string;
  selectedYear: string;
}

const ExportPdfReport = ({ selectedMonth, selectedYear }: ExportPdfReportProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const getDateRange = () => {
    if (selectedYear === 'all') {
      return { start: '2020-01-01', end: format(new Date(), 'yyyy-MM-dd'), label: 'All Years' };
    }
    const year = parseInt(selectedYear);
    if (selectedMonth === 'all') {
      return {
        start: format(startOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd'),
        end: format(endOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd'),
        label: `Year ${selectedYear}`,
      };
    }
    const month = parseInt(selectedMonth) - 1;
    const date = new Date(year, month, 1);
    return {
      start: format(startOfMonth(date), 'yyyy-MM-dd'),
      end: format(endOfMonth(date), 'yyyy-MM-dd'),
      label: format(date, 'MMMM yyyy'),
    };
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const handleExport = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { start, end, label } = getDateRange();

      const [incomeRes, expenseRes, savingsRes] = await Promise.all([
        supabase.from('income').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date'),
        supabase.from('expenses').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date'),
        supabase.from('savings').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date'),
      ]);

      const incomeData = incomeRes.data || [];
      const expenseData = expenseRes.data || [];
      const savingsData = savingsRes.data || [];

      const totalIncome = incomeData.reduce((s, i) => s + Number(i.amount), 0);
      const totalExpenses = expenseData.reduce((s, e) => s + Number(e.amount), 0);
      const totalSavings = savingsData.reduce((s, sv) => s + Number(sv.amount), 0);
      const netBalance = totalIncome - totalExpenses - totalSavings;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('BSH Accounts', 14, 18);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Financial Report — ${label}`, 14, 28);
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth - 14, 28, { align: 'right' });

      // Summary box
      let y = 45;
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, y);
      y += 8;

      const summaryRows = [
        ['Total Income', formatCurrency(totalIncome)],
        ['Total Expenses', formatCurrency(totalExpenses)],
        ['Total Savings', formatCurrency(totalSavings)],
        ['Net Balance', formatCurrency(netBalance)],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Category', 'Amount']],
        body: summaryRows,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 14;

      // Income table
      if (incomeData.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Income Details', 14, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          head: [['Date', 'Source', 'Amount']],
          body: incomeData.map((i) => [format(new Date(i.date), 'dd/MM/yyyy'), i.source, formatCurrency(Number(i.amount))]),
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: { 2: { halign: 'right' } },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 14;
      }

      // Expenses table
      if (expenseData.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Expense Details', 14, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          head: [['Date', 'Details', 'Payment Mode', 'Amount']],
          body: expenseData.map((e) => [
            format(new Date(e.date), 'dd/MM/yyyy'),
            e.expense_details,
            e.payment_mode,
            formatCurrency(Number(e.amount)),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68] },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: { 3: { halign: 'right' } },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 14;
      }

      // Savings table
      if (savingsData.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Savings Details', 14, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          head: [['Date', 'Details', 'Amount']],
          body: savingsData.map((s) => [format(new Date(s.date), 'dd/MM/yyyy'), s.details, formatCurrency(Number(s.amount))]),
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: { 2: { halign: 'right' } },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer on each page
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
      }

      const fileName = `BSH_Report_${label.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
      toast.success(`Report downloaded: ${fileName}`);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading} variant="outline" size="sm" className="hover-lift">
      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
      <span className="hidden sm:inline">Export PDF</span>
      <span className="sm:hidden">PDF</span>
    </Button>
  );
};

export default ExportPdfReport;
