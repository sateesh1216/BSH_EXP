import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileDown, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const DownloadData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
  const [selectedMonth, setSelectedMonth] = useState('all');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const handleDownload = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }

    setDownloading(true);
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

      // Check for errors
      if (incomeResult.error) throw incomeResult.error;
      if (expensesResult.error) throw expensesResult.error;
      if (savingsResult.error) throw savingsResult.error;

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

      // Generate filename with period info
      const periodStr = selectedMonth === 'all' ? `Year_${selectedYear}` : `${format(new Date(year, parseInt(selectedMonth) - 1), 'MMM_yyyy')}`;
      const filename = `Financial_Data_${periodStr}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      
      // Write file
      XLSX.writeFile(workbook, filename);

      const totalRecords = (incomeResult.data?.length || 0) + (expensesResult.data?.length || 0) + (savingsResult.data?.length || 0);
      
      toast({
        title: 'Download Complete',
        description: `${totalRecords} records exported to Excel successfully.`,
      });
    } catch (error) {
      console.error('Error downloading data:', error);
      toast({
        title: 'Download Failed',
        description: 'There was an error exporting the data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Download Financial Data
        </CardTitle>
        <CardDescription>
          Export your income, expenses, and savings data to Excel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filter Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Year</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Month</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months (Yearly)</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={handleDownload} 
            disabled={downloading}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Downloading...' : 'Download Excel'}
          </Button>
          
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {selectedMonth === 'all' 
              ? `All data for ${selectedYear}` 
              : `Data for ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DownloadData;