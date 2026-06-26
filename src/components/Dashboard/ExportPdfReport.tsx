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

  // PDF-safe currency: jsPDF's built-in fonts don't render ₹ (renders as black box).
  // Use "Rs." with Indian digit grouping for clear, legible amounts.
  const formatCurrency = (amount: number) => {
    const sign = amount < 0 ? '-' : '';
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    return `${sign}Rs. ${formatted}`;
  };

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
      // ── Header ──
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 38, 'F');
      doc.setFillColor(37, 99, 235); // accent strip
      doc.rect(0, 38, pageWidth, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('BSH Accounts', marginLeft, 16);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Financial Report  -  ${label}`, marginLeft, 26);
      doc.setFontSize(9);
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth - marginRight, 26, { align: 'right' });

      // ── Build month groups early (needed for monthly cards + TOC) ──
      const groupByMonth = selectedMonth === 'all';

      type Group = {
        key: string;
        label: string;
        income: typeof incomeData;
        expenses: typeof expenseData;
        savings: typeof savingsData;
        loans: typeof loansData;
        startPage?: number;
      };

      const buildGroups = (): Group[] => {
        if (!groupByMonth) {
          return [{
            key: 'all', label,
            income: incomeData, expenses: expenseData, savings: savingsData, loans: loansData,
          }];
        }
        const map = new Map<string, Group>();
        const ensure = (date: string): Group => {
          const d = new Date(date);
          const key = format(d, 'yyyy-MM');
          if (!map.has(key)) {
            map.set(key, { key, label: format(d, 'MMMM yyyy'), income: [], expenses: [], savings: [], loans: [] });
          }
          return map.get(key)!;
        };
        incomeData.forEach(r => ensure(r.date).income.push(r));
        expenseData.forEach(r => ensure(r.date).expenses.push(r));
        savingsData.forEach(r => ensure(r.date).savings.push(r));
        loansData.forEach(r => ensure(r.date).loans.push(r));
        return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
      };

      const groups = buildGroups();
      const sumAmt = (arr: any[]) => arr.reduce((s, r) => s + Number(r.amount), 0);

      // ── Grand Totals ──
      let y = 50;
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(groupByMonth ? 'Grand Totals (All Months)' : 'Financial Summary', marginLeft, y);
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

      const cardWidth = (contentWidth - 6) / 2;
      const cardHeight = 20;
      summaryItems.forEach((item, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cx = marginLeft + col * (cardWidth + 6);
        const cy = y + row * (cardHeight + 4);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(cx, cy, cardWidth, cardHeight, 2, 2, 'F');
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.roundedRect(cx, cy, 3, cardHeight, 1.5, 1.5, 'F');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(item.label, cx + 8, cy + 8);
        doc.setTextColor(item.color[0], item.color[1], item.color[2]);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(item.value), cx + 8, cy + 16);
      });

      const summaryRows = Math.ceil(summaryItems.length / 2);
      y += summaryRows * (cardHeight + 4) + 10;

      // ── Monthly Breakdown Cards (only when grouping by month) ──
      if (groupByMonth && groups.length > 0) {
        // start on a fresh page if not enough room
        if (y > pageHeight - 80) { doc.addPage(); y = 20; }
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Monthly Breakdown', marginLeft, y);
        y += 7;

        const mCols = 3;
        const mGap = 4;
        const mW = (contentWidth - mGap * (mCols - 1)) / mCols;
        const mH = 28;

        for (let idx = 0; idx < groups.length; idx++) {
          const col = idx % mCols;
          if (col === 0 && idx > 0) y += mH + mGap;
          if (y + mH > pageHeight - 20) { doc.addPage(); y = 20; }
          const cx = marginLeft + col * (mW + mGap);
          const g = groups[idx];
          const inc = sumAmt(g.income);
          const exp = sumAmt(g.expenses);
          const sav = sumAmt(g.savings);
          const net = inc - exp - sav;

          doc.setFillColor(248, 250, 252);
          doc.roundedRect(cx, y, mW, mH, 2, 2, 'F');
          doc.setFillColor(37, 99, 235);
          doc.roundedRect(cx, y, mW, 6, 2, 2, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(g.label, cx + 3, y + 4.3);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(34, 197, 94);
          doc.text(`In:  ${formatCurrency(inc)}`, cx + 3, y + 11);
          doc.setTextColor(239, 68, 68);
          doc.text(`Ex: ${formatCurrency(exp)}`, cx + 3, y + 15.5);
          doc.setTextColor(59, 130, 246);
          doc.text(`Sv: ${formatCurrency(sav)}`, cx + 3, y + 20);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(net >= 0 ? 34 : 239, net >= 0 ? 197 : 68, net >= 0 ? 94 : 68);
          doc.text(`Net: ${formatCurrency(net)}`, cx + 3, y + 25.5);
        }
        y += mH + 8;
      }

      // ── Reserve TOC page (filled after sections render) ──
      let tocPageNumber: number | null = null;
      if (groupByMonth && groups.length > 1) {
        doc.addPage();
        tocPageNumber = doc.getNumberOfPages();
      }

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
        doc.text(
          `${rows.length} record${rows.length !== 1 ? 's' : ''}`,
          pageWidth - marginRight,
          y,
          { align: 'right' },
        );
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

      // ── Render each group (start on its own page when grouped) ──
      const renderMonthHeader = (groupLabel: string) => {
        doc.setFillColor(15, 23, 42);
        doc.rect(marginLeft, y - 5, contentWidth, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(groupLabel, marginLeft + 4, y + 2);
        y += 12;
        doc.setTextColor(30, 30, 30);
      };

      groups.forEach((g, gIdx) => {
        if (groupByMonth) {
          // Each month starts on a fresh page so TOC links land at the top.
          doc.addPage();
          y = 20;
          g.startPage = doc.getNumberOfPages();
          renderMonthHeader(g.label);
        }

        addSection(
          'Income Details',
          [34, 197, 94],
          ['#', 'Date', 'Source', 'Amount'],
          g.income.map((i, idx) => [
            String(idx + 1),
            format(new Date(i.date), 'dd MMM yyyy'),
            i.source,
            formatCurrency(Number(i.amount)),
          ]),
          [3],
          { 0: { cellWidth: 10 }, 1: { cellWidth: 28 } },
        );

        addSection(
          'Expense Details',
          [239, 68, 68],
          ['#', 'Date', 'Details', 'Payment Mode', 'Amount'],
          g.expenses.map((e, idx) => [
            String(idx + 1),
            format(new Date(e.date), 'dd MMM yyyy'),
            e.expense_details,
            e.payment_mode,
            formatCurrency(Number(e.amount)),
          ]),
          [4],
          { 0: { cellWidth: 10 }, 1: { cellWidth: 28 }, 3: { cellWidth: 28 } },
        );

        // Expense Breakdown by Payment Mode (acts as category)
        if (g.expenses.length > 0) {
          const totals = new Map<string, { amount: number; count: number }>();
          g.expenses.forEach(e => {
            const key = (e.payment_mode || 'Other').trim() || 'Other';
            const prev = totals.get(key) || { amount: 0, count: 0 };
            totals.set(key, { amount: prev.amount + Number(e.amount), count: prev.count + 1 });
          });
          const grand = Array.from(totals.values()).reduce((s, v) => s + v.amount, 0);
          const breakdownRows = Array.from(totals.entries())
            .sort((a, b) => b[1].amount - a[1].amount)
            .map(([mode, v], idx) => [
              String(idx + 1),
              mode,
              String(v.count),
              `${((v.amount / grand) * 100).toFixed(1)}%`,
              formatCurrency(v.amount),
            ]);
          breakdownRows.push([
            '',
            'TOTAL',
            String(g.expenses.length),
            '100.0%',
            formatCurrency(grand),
          ]);

          addSection(
            'Expense Breakdown by Category',
            [217, 70, 239],
            ['#', 'Payment Mode', 'Count', 'Share', 'Amount'],
            breakdownRows,
            [4],
            { 0: { cellWidth: 10 }, 2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 22, halign: 'right' } },
          );
        }



        addSection(
          'Savings Details',
          [59, 130, 246],
          ['#', 'Date', 'Details', 'Amount'],
          g.savings.map((s, idx) => [
            String(idx + 1),
            format(new Date(s.date), 'dd MMM yyyy'),
            s.details,
            formatCurrency(Number(s.amount)),
          ]),
          [3],
          { 0: { cellWidth: 10 }, 1: { cellWidth: 28 } },
        );

        if (g.loans.length > 0) {
          addSection(
            'Hand Loan Details',
            [249, 115, 22],
            ['#', 'Date', 'Borrower', 'Amount', 'Repaid', 'Remaining', 'Interest', 'Status'],
            g.loans.map((loan, idx) => [
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
      });

      // ── Fill in reserved TOC page with clickable links ──
      if (tocPageNumber && groupByMonth) {
        doc.setPage(tocPageNumber);
        let ty = 30;
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Table of Contents', marginLeft, ty);
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.6);
        doc.line(marginLeft, ty + 2, marginLeft + 60, ty + 2);
        ty += 14;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        groups.forEach((g, idx) => {
          if (ty > pageHeight - 20) return; // safety
          const inc = sumAmt(g.income);
          const exp = sumAmt(g.expenses);
          const sav = sumAmt(g.savings);
          const net = inc - exp - sav;
          const lineY = ty;

          // Index + month name (clickable, blue)
          doc.setTextColor(37, 99, 235);
          doc.setFont('helvetica', 'bold');
          const labelText = `${String(idx + 1).padStart(2, '0')}.  ${g.label}`;
          doc.text(labelText, marginLeft, lineY);
          const labelW = doc.getTextWidth(labelText);

          // Net amount right-aligned
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(net >= 0 ? 34 : 239, net >= 0 ? 197 : 68, net >= 0 ? 94 : 68);
          const netText = `Net ${formatCurrency(net)}`;
          doc.text(netText, pageWidth - marginRight, lineY, { align: 'right' });

          // Dotted leader
          doc.setTextColor(180, 180, 180);
          const leaderStart = marginLeft + labelW + 3;
          const leaderEnd = pageWidth - marginRight - doc.getTextWidth(netText) - 3;
          if (leaderEnd > leaderStart) {
            doc.setLineDashPattern([0.6, 1.4], 0);
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.3);
            doc.line(leaderStart, lineY - 1.2, leaderEnd, lineY - 1.2);
            doc.setLineDashPattern([], 0);
          }

          // Clickable hotspot covers the whole row
          if (g.startPage) {
            doc.link(marginLeft, lineY - 5, contentWidth, 8, { pageNumber: g.startPage });
          }

          ty += 9;
        });
      }

      // ── Footer on each page ──
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        // Bottom line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
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
