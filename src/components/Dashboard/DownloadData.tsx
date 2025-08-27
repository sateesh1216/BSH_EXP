import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface DownloadDataProps {
  selectedMonth: string;
  selectedYear: string;
}

const DownloadData = ({ selectedMonth, selectedYear }: DownloadDataProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!user?.id) return;

    try {
      // Get all data with date filtering
      const year = parseInt(selectedYear);
      let startDate, endDate;

      if (selectedMonth === 'all') {
        startDate = format(new Date(year, 0, 1), 'yyyy-MM-dd');
        endDate = format(new Date(year, 11, 31), 'yyyy-MM-dd');
      } else {
        const month = parseInt(selectedMonth) - 1;
        const date = new Date(year, month, 1);
        startDate = format(date, 'yyyy-MM-01');
        endDate = format(new Date(year, month + 1, 0), 'yyyy-MM-dd');
      }

      const [incomeResult, expensesResult, savingsResult] = await Promise.all([
        supabase
          .from('income')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false }),
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false }),
        supabase
          .from('savings')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false })
      ]);

      const workbook = XLSX.utils.book_new();

      // Calculate totals for summary
      const totalIncome = incomeResult.data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const totalExpenses = expensesResult.data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const totalSavings = savingsResult.data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const netAmount = totalIncome - totalExpenses - totalSavings;

      // Summary sheet
      const summaryData = [{
        'Total Income': totalIncome,
        'Total Expenses': totalExpenses,
        'Total Savings': totalSavings,
        'Net Amount': netAmount,
        'Period': selectedMonth === 'all' ? `Year ${selectedYear}` : `${format(new Date(year, parseInt(selectedMonth) - 1), 'MMMM yyyy')}`
      }];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Income sheet
      if (incomeResult.data && incomeResult.data.length > 0) {
        const incomeSheet = XLSX.utils.json_to_sheet(
          incomeResult.data.map(item => ({
            Date: format(new Date(item.date), 'dd/MM/yyyy'),
            Source: item.source,
            Amount: item.amount
          }))
        );
        XLSX.utils.book_append_sheet(workbook, incomeSheet, 'Income');
      }

      // Expenses sheet
      if (expensesResult.data && expensesResult.data.length > 0) {
        const expensesSheet = XLSX.utils.json_to_sheet(
          expensesResult.data.map(item => ({
            Date: format(new Date(item.date), 'dd/MM/yyyy'),
            'Expense Details': item.expense_details,
            'Payment Mode': item.payment_mode,
            Amount: item.amount
          }))
        );
        XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses');
      }

      // Savings sheet
      if (savingsResult.data && savingsResult.data.length > 0) {
        const savingsSheet = XLSX.utils.json_to_sheet(
          savingsResult.data.map(item => ({
            Date: format(new Date(item.date), 'dd/MM/yyyy'),
            Details: item.details,
            Amount: item.amount
          }))
        );
        XLSX.utils.book_append_sheet(workbook, savingsSheet, 'Savings');
      }

      // Generate filename with current date
      const filename = `BSH_Expenses_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      
      // Write file
      XLSX.writeFile(workbook, filename);

      toast({
        title: 'Download Complete',
        description: 'All data exported to Excel successfully.',
      });
    } catch (error) {
      console.error('Error downloading data:', error);
      toast({
        title: 'Download Failed',
        description: 'There was an error exporting the data.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button onClick={handleDownload} variant="outline" size="sm">
      <Download className="h-4 w-4 mr-2" />
      Download Excel
    </Button>
  );
};

export default DownloadData;