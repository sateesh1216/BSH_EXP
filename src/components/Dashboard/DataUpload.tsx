import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

const DataUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const downloadTemplate = () => {
    // Create sample data for each sheet
    const incomeTemplate = [
      { date: '2024-01-15', amount: 50000, source: 'Salary' },
      { date: '2024-01-20', amount: 5000, source: 'Freelance Work' },
    ];

    const expensesTemplate = [
      { date: '2024-01-10', amount: 2000, expense_details: 'Bike Petrol', payment_mode: 'Card' },
      { date: '2024-01-12', amount: 1500, expense_details: 'Groceries', payment_mode: 'Cash' },
    ];

    const savingsTemplate = [
      { date: '2024-01-31', amount: 10000, details: 'Monthly Savings' },
      { date: '2024-01-15', amount: 5000, details: 'Emergency Fund' },
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add instruction sheet
    const instructions = [
      ['INSTRUCTIONS FOR DATA UPLOAD'],
      [''],
      ['1. Fill in your data in the respective sheets (Income, Expenses, Savings)'],
      ['2. Date format: YYYY-MM-DD (e.g., 2024-01-15)'],
      ['3. Amount: Numbers only (e.g., 1500, 50000)'],
      ['4. Do NOT change column headers'],
      ['5. Delete the sample rows and add your actual data'],
      ['6. Save as Excel file (.xlsx) and upload'],
      [''],
      ['COLUMN REQUIREMENTS:'],
      [''],
      ['Income Sheet:'],
      ['- date: Date of income (YYYY-MM-DD)'],
      ['- amount: Income amount (number)'],
      ['- source: Source of income (text)'],
      [''],
      ['Expenses Sheet:'],
      ['- date: Date of expense (YYYY-MM-DD)'],
      ['- amount: Expense amount (number)'],
      ['- expense_details: Description of expense (text)'],
      ['- payment_mode: How you paid (Cash/Card/UPI/etc.)'],
      [''],
      ['Savings Sheet:'],
      ['- date: Date of saving (YYYY-MM-DD)'],
      ['- amount: Savings amount (number)'],
      ['- details: Description of savings (text)'],
    ];

    const instructionWs = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, instructionWs, 'Instructions');

    // Add data sheets
    const incomeWs = XLSX.utils.json_to_sheet(incomeTemplate);
    const expensesWs = XLSX.utils.json_to_sheet(expensesTemplate);
    const savingsWs = XLSX.utils.json_to_sheet(savingsTemplate);

    XLSX.utils.book_append_sheet(wb, incomeWs, 'Income');
    XLSX.utils.book_append_sheet(wb, expensesWs, 'Expenses');
    XLSX.utils.book_append_sheet(wb, savingsWs, 'Savings');

    // Download file
    XLSX.writeFile(wb, 'financial_data_template.xlsx');
    
    toast({
      title: "Template Downloaded",
      description: "Fill in your data and upload the file back.",
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload data.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      const skippedRows: string[] = [];

      // Helper function to parse date
      const parseDate = (dateValue: any): string | null => {
        if (!dateValue) return null;
        
        try {
          // Handle Excel date numbers
          if (typeof dateValue === 'number') {
            const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
            return excelDate.toISOString().split('T')[0];
          }
          
          // Handle string dates
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return null;
          
          return date.toISOString().split('T')[0];
        } catch {
          return null;
        }
      };

      // Process Income sheet
      if (workbook.SheetNames.includes('Income')) {
        const incomeSheet = workbook.Sheets['Income'];
        const incomeData = XLSX.utils.sheet_to_json(incomeSheet) as any[];
        
        for (let i = 0; i < incomeData.length; i++) {
          const row = incomeData[i];
          try {
            const parsedDate = parseDate(row.date);
            const amount = Number(row.amount);
            
            // Validate required fields
            if (!parsedDate || isNaN(amount) || !row.source) {
              skippedCount++;
              const missing = [];
              if (!parsedDate) missing.push('date');
              if (isNaN(amount)) missing.push('amount');
              if (!row.source) missing.push('source');
              skippedRows.push(`Income row ${i + 2}: Missing ${missing.join(', ')}`);
              continue;
            }

            const { error } = await supabase.from('income').insert({
              user_id: user.id,
              date: parsedDate,
              amount: amount,
              source: row.source.toString()
            });
            
            if (error) throw error;
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push(`Income row ${i + 2}: ${error}`);
          }
        }
      }

      // Process Expenses sheet
      if (workbook.SheetNames.includes('Expenses')) {
        const expensesSheet = workbook.Sheets['Expenses'];
        const expensesData = XLSX.utils.sheet_to_json(expensesSheet) as any[];
        
        for (let i = 0; i < expensesData.length; i++) {
          const row = expensesData[i];
          try {
            const parsedDate = parseDate(row.date);
            const amount = Number(row.amount);
            
            // Validate required fields
            if (!parsedDate || isNaN(amount) || !row.expense_details || !row.payment_mode) {
              skippedCount++;
              const missing = [];
              if (!parsedDate) missing.push('date');
              if (isNaN(amount)) missing.push('amount');
              if (!row.expense_details) missing.push('expense_details');
              if (!row.payment_mode) missing.push('payment_mode');
              skippedRows.push(`Expenses row ${i + 2}: Missing ${missing.join(', ')}`);
              continue;
            }

            const { error } = await supabase.from('expenses').insert({
              user_id: user.id,
              date: parsedDate,
              amount: amount,
              expense_details: row.expense_details.toString(),
              payment_mode: row.payment_mode.toString()
            });
            
            if (error) throw error;
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push(`Expenses row ${i + 2}: ${error}`);
          }
        }
      }

      // Process Savings sheet
      if (workbook.SheetNames.includes('Savings')) {
        const savingsSheet = workbook.Sheets['Savings'];
        const savingsData = XLSX.utils.sheet_to_json(savingsSheet) as any[];
        
        for (let i = 0; i < savingsData.length; i++) {
          const row = savingsData[i];
          try {
            const parsedDate = parseDate(row.date);
            const amount = Number(row.amount);
            
            // Validate required fields
            if (!parsedDate || isNaN(amount)) {
              skippedCount++;
              const missing = [];
              if (!parsedDate) missing.push('date');
              if (isNaN(amount)) missing.push('amount');
              skippedRows.push(`Savings row ${i + 2}: Missing ${missing.join(', ')}`);
              continue;
            }

            const { error } = await supabase.from('savings').insert({
              user_id: user.id,
              date: parsedDate,
              amount: amount,
              details: row.details ? row.details.toString() : null
            });
            
            if (error) throw error;
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push(`Savings row ${i + 2}: ${error}`);
          }
        }
      }

      // Show detailed results
      if (successCount > 0) {
        let description = `${successCount} records uploaded successfully`;
        if (skippedCount > 0) description += `, ${skippedCount} rows skipped`;
        if (errorCount > 0) description += `, ${errorCount} failed`;
        
        toast({
          title: "Upload Complete",
          description: description + '. Check console for details.',
        });
        
        // Log details to console for user reference
        if (skippedRows.length > 0) {
          console.log('Skipped rows (missing data):', skippedRows);
        }
        if (errors.length > 0) {
          console.log('Error details:', errors);
        }
      } else {
        toast({
          title: "Upload Failed",
          description: `No records were uploaded. ${skippedCount} rows skipped, ${errorCount} errors. Check console for details.`,
          variant: "destructive",
        });
        
        console.log('Skipped rows:', skippedRows);
        console.log('Errors:', errors);
      }

      // Clear the input
      event.target.value = '';
      
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Upload Error",
        description: "Failed to process the file. Please check the format and try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Upload Financial Data
        </CardTitle>
        <CardDescription>
          Upload your existing financial data from an Excel file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={downloadTemplate}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="file-upload">Upload Excel File</Label>
          <div className="flex items-center gap-2">
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="flex-1"
            />
            <Button disabled={uploading} variant="outline" size="icon">
              <Upload className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Accepted formats: .xlsx, .xls
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataUpload;