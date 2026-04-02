import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, differenceInDays } from 'date-fns';
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

      const [incomeRes, expenseRes, savingsRes, loansRes, repaymentsRes] = await Promise.all([
        supabase.from('income').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date'),
        supabase.from('expenses').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date'),
        supabase.from('savings').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date'),
        supabase.from('hand_loans').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date'),
        supabase.from('loan_repayments').select('*').eq('user_id', user.id).order('date'),
      ]);

      const incomeData = incomeRes.data || [];
      const expenseData = expenseRes.data || [];
      const savingsData = savingsRes.data || [];
      const loansData = loansRes.data || [];
      const repaymentsData = repaymentsRes.data || [];

      const totalIncome = incomeData.reduce((s, i) => s + Number(i.amount), 0);
      const totalExpenses = expenseData.reduce((s, e) => s + Number(e.amount), 0);
      const totalSavings = savingsData.reduce((s, sv) => s + Number(sv.amount), 0);
      const netBalance = totalIncome - totalExpenses - totalSavings;

      const getRepaidTotal = (loanId: string) =>
        repaymentsData.filter(r => r.loan_id === loanId).reduce((s, r) => s + Number(r.amount), 0);
      const getRemaining = (loan: any) => Number(loan.amount) - getRepaidTotal(loan.id);
      const calcInterest = (loan: any) => {
        const rem = getRemaining(loan);
        if (rem <= 0 || !loan.interest_rate) return 0;
        const days = Math.max(differenceInDays(new Date(), new Date(loan.date)), 1);
        return (rem * Number(loan.interest_rate) * days) / 365 / 100;
      };

      const totalLoansGiven = loansData.reduce((s, l) => s + Number(l.amount), 0);
      const totalRepaid = loansData.reduce((s, l) => s + getRepaidTotal(l.id), 0);
      const totalRemaining = totalLoansGiven - totalRepaid;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginLeft = 14;
      const marginRight = 14;
      const contentWidth = pageWidth - marginLeft - marginRight;

      // Helper: check page space, add new page if needed
      const ensureSpace = (currentY: number, needed: number) => {
        if (currentY + needed > pageHeight - 20) {
          doc.addPage();
          return 20;
        }
        return currentY;
      };

      // ── Header ──
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 38, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('BSH Accounts', marginLeft, 16);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Financial Report  —  ${label}`, marginLeft, 26);
      doc.setFontSize(9);
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth - marginRight, 26, { align: 'right' });

      // Thin accent line
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 38, pageWidth, 1.5, 'F');

      // ── Summary Cards ──
      let y = 50;
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Financial Summary', marginLeft, y);
      y += 8;

      const summaryItems = [
        { label: 'Total Income', value: totalIncome, color: [34, 197, 94] as [number, number, number] },
        { label: 'Total Expenses', value: totalExpenses, color: [239, 68, 68] as [number, number, number] },
        { label: 'Total Savings', value: totalSavings, color: [59, 130, 246] as [number, number, number] },
        { label: 'Net Balance', value: netBalance, color: netBalance >= 0 ? [34, 197, 94] as [number, number, number] : [239, 68, 68] as [number, number, number] },
      ];

      if (loansData.length > 0) {
        summaryItems.push(
          { label: 'Loans Given', value: totalLoansGiven, color: [249, 115, 22] },
          { label: 'Total Repaid', value: totalRepaid, color: [34, 197, 94] },
          { label: 'Remaining', value: totalRemaining, color: [245, 158, 11] },
        );
      }

      // Draw summary as styled cards (2 per row)
      const cardWidth = (contentWidth - 6) / 2;
      const cardHeight = 20;
      summaryItems.forEach((item, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cx = marginLeft + col * (cardWidth + 6);
        const cy = y + row * (cardHeight + 4);

        // Card background
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(cx, cy, cardWidth, cardHeight, 2, 2, 'F');

        // Color accent bar
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.roundedRect(cx, cy, 3, cardHeight, 1.5, 1.5, 'F');

        // Label
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(item.label, cx + 8, cy + 8);

        // Value
        doc.setTextColor(item.color[0], item.color[1], item.color[2]);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(item.value), cx + 8, cy + 16);
      });

      const summaryRows = Math.ceil(summaryItems.length / 2);
      y += summaryRows * (cardHeight + 4) + 10;

      // ── Section helper ──
      const addSection = (
        title: string,
        headerColor: [number, number, number],
        columns: string[],
        rows: string[][],
        amountColIndices: number[],
        colWidths?: { [key: number]: { cellWidth: number; halign?: string } },
      ) => {
        if (rows.length === 0) return;

        y = ensureSpace(y, 30);

        // Section title with colored dot
        doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
        doc.circle(marginLeft + 3, y - 2, 3, 'F');
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(title, marginLeft + 10, y);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text(`${rows.length} record${rows.length !== 1 ? 's' : ''}`, marginLeft + 10 + doc.getTextWidth(title) + 4, y);
        y += 6;

        const colStyles: any = {};
        amountColIndices.forEach(idx => {
          colStyles[idx] = { halign: 'right', fontStyle: 'bold', cellWidth: 30 };
        });
        if (colWidths) {
          Object.keys(colWidths).forEach(key => {
            const k = Number(key);
            colStyles[k] = { ...colStyles[k], ...colWidths[k] };
          });
        }

        autoTable(doc, {
          startY: y,
          head: [columns],
          body: rows,
          theme: 'grid',
          headStyles: {
            fillColor: headerColor,
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: 3,
            halign: 'left',
            overflow: 'linebreak',
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 2.5,
            textColor: [40, 40, 40],
            overflow: 'linebreak',
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          columnStyles: colStyles,
          margin: { left: marginLeft, right: marginRight },
          tableLineColor: [220, 220, 220],
          tableLineWidth: 0.2,
          tableWidth: 'auto',
          didParseCell: (data: any) => {
            if (data.section === 'body' && amountColIndices.includes(data.column.index)) {
              data.cell.styles.textColor = headerColor;
            }
          },
        });

        y = (doc as any).lastAutoTable.finalY + 14;
      };

      // ── Income ──
      addSection(
        'Income Details',
        [34, 197, 94],
        ['#', 'Date', 'Source', 'Amount'],
        incomeData.map((i, idx) => [
          String(idx + 1),
          format(new Date(i.date), 'dd MMM yyyy'),
          i.source,
          formatCurrency(Number(i.amount)),
        ]),
        [3],
        { 0: { cellWidth: 10 }, 1: { cellWidth: 28 } },
      );

      // ── Expenses ──
      addSection(
        'Expense Details',
        [239, 68, 68],
        ['#', 'Date', 'Details', 'Payment Mode', 'Amount'],
        expenseData.map((e, idx) => [
          String(idx + 1),
          format(new Date(e.date), 'dd MMM yyyy'),
          e.expense_details,
          e.payment_mode,
          formatCurrency(Number(e.amount)),
        ]),
        [4],
        { 0: { cellWidth: 10 }, 1: { cellWidth: 28 }, 3: { cellWidth: 28 } },
      );

      // ── Savings ──
      addSection(
        'Savings Details',
        [59, 130, 246],
        ['#', 'Date', 'Details', 'Amount'],
        savingsData.map((s, idx) => [
          String(idx + 1),
          format(new Date(s.date), 'dd MMM yyyy'),
          s.details,
          formatCurrency(Number(s.amount)),
        ]),
        [3],
        { 0: { cellWidth: 10 }, 1: { cellWidth: 28 } },
      );

      // ── Hand Loans ──
      if (loansData.length > 0) {
        addSection(
          'Hand Loan Details',
          [249, 115, 22],
          ['#', 'Date', 'Borrower', 'Amount', 'Repaid', 'Remaining', 'Interest', 'Status'],
          loansData.map((loan, idx) => [
            String(idx + 1),
            format(new Date(loan.date), 'dd MMM yyyy'),
            loan.borrower_name,
            formatCurrency(Number(loan.amount)),
            formatCurrency(getRepaidTotal(loan.id)),
            formatCurrency(getRemaining(loan)),
            formatCurrency(Math.round(calcInterest(loan) * 100) / 100),
            loan.status,
          ]),
          [3, 4, 5, 6],
          { 0: { cellWidth: 8 }, 1: { cellWidth: 24 }, 7: { cellWidth: 20, halign: 'center' } },
        );
      }

      // ── Footer on each page ──
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        // Bottom line
        doc.setDrawColor(200, 200, 200);
        doc.line(marginLeft, pageHeight - 14, pageWidth - marginRight, pageHeight - 14);
        // Page number
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text(`BSH Accounts  •  ${label}`, marginLeft, pageHeight - 8);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginRight, pageHeight - 8, { align: 'right' });
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
