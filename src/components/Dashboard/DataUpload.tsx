import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, X, FileUp, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

type ParsedRow = {
  data: any;
  valid: boolean;
  errors: string[];
  rowNumber: number;
};

type ParsedSheet = {
  name: 'Income' | 'Expenses' | 'Savings';
  rows: ParsedRow[];
};

const REQUIRED: Record<string, string[]> = {
  Income: ['date', 'amount', 'source'],
  Expenses: ['date', 'amount', 'expense_details', 'payment_mode'],
  Savings: ['date', 'amount'],
};

const parseDate = (v: any): string | null => {
  if (!v && v !== 0) return null;
  try {
    if (typeof v === 'number') {
      const d = new Date((v - 25569) * 86400 * 1000);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  } catch {
    return null;
  }
};

const validateRow = (sheet: string, row: any, index: number): ParsedRow => {
  const errors: string[] = [];
  const required = REQUIRED[sheet] || [];
  const parsedDate = parseDate(row.date);
  const amount = Number(row.amount);

  if (!parsedDate) errors.push('Invalid date');
  if (isNaN(amount) || amount <= 0) errors.push('Invalid amount');
  for (const f of required) {
    if (f === 'date' || f === 'amount') continue;
    if (!row[f]) errors.push(`Missing ${f}`);
  }

  return {
    rowNumber: index + 2,
    data: { ...row, date: parsedDate, amount },
    valid: errors.length === 0,
    errors,
  };
};

const DataUpload = () => {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState<ParsedSheet[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0, success: 0, failed: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // ---------- Instructions sheet ----------
    const instructions = [
      ['BSH ACCOUNTS — DATA UPLOAD TEMPLATE'],
      [''],
      ['HOW TO USE'],
      ['1.  Open the Income, Expenses, and Savings sheets below.'],
      ['2.  Replace the sample rows with your own data (delete the samples when done).'],
      ['3.  Keep the column headers exactly as they are — do NOT rename or reorder.'],
      ['4.  Save the file as .xlsx and drag it back into the Upload area.'],
      [''],
      ['COLUMN RULES'],
      ['•  date            → Format YYYY-MM-DD (e.g. 2024-01-15). Excel dates also work.'],
      ['•  amount          → Number only. No ₹ symbol, no commas (e.g. 50000, not ₹50,000).'],
      ['•  source          → Income source text (e.g. Salary, Freelance, Interest).'],
      ['•  expense_details → What you spent on (e.g. Groceries, Fuel, Rent).'],
      ['•  payment_mode    → One of: UPI, Cash, Card, Credit Card, Bank Transfer, Other.'],
      ['•  details         → Optional note for savings (e.g. Emergency Fund).'],
      [''],
      ['TIPS'],
      ['•  You can leave a sheet empty if you have no data for it.'],
      ['•  Rows with errors are shown in the preview before import — you can fix and re-upload.'],
      ['•  Amounts must be greater than zero.'],
    ];
    const insWs = XLSX.utils.aoa_to_sheet(instructions);
    insWs['!cols'] = [{ wch: 90 }];
    // Bold section headings
    ['A1', 'A3', 'A9', 'A17'].forEach((c) => {
      if (insWs[c]) insWs[c].s = { font: { bold: true, sz: 12 } };
    });
    XLSX.utils.book_append_sheet(wb, insWs, 'Instructions');

    // ---------- Data sheets with multiple examples ----------
    const income = [
      { date: '2024-01-01', amount: 50000, source: 'Salary' },
      { date: '2024-01-15', amount: 8000, source: 'Freelance Work' },
      { date: '2024-01-28', amount: 1200, source: 'Interest' },
    ];
    const expenses = [
      { date: '2024-01-02', amount: 12000, expense_details: 'Rent', payment_mode: 'Bank Transfer' },
      { date: '2024-01-05', amount: 2500, expense_details: 'Groceries', payment_mode: 'UPI' },
      { date: '2024-01-10', amount: 800, expense_details: 'Fuel', payment_mode: 'Card' },
      { date: '2024-01-18', amount: 450, expense_details: 'Dining Out', payment_mode: 'UPI' },
    ];
    const savings = [
      { date: '2024-01-05', amount: 5000, details: 'Emergency Fund' },
      { date: '2024-01-31', amount: 10000, details: 'Monthly Savings' },
    ]), 'Savings');
    XLSX.writeFile(wb, 'bsh_accounts_template.xlsx');
    toast({ title: 'Template downloaded', description: 'Fill it in and drag it back here.' });
  };

  const parseFile = useCallback(async (f: File) => {
    setParsing(true);
    setParsed([]);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheets: ParsedSheet[] = [];
      for (const name of ['Income', 'Expenses', 'Savings'] as const) {
        if (!wb.SheetNames.includes(name)) continue;
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[name]) as any[];
        sheets.push({ name, rows: rows.map((r, i) => validateRow(name, r, i)) });
      }
      setParsed(sheets);
      if (sheets.length === 0) {
        toast({ title: 'No valid sheets', description: 'Expected Income, Expenses, or Savings sheets.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Parse failed', description: 'Could not read this file.', variant: 'destructive' });
    } finally {
      setParsing(false);
    }
  }, [toast]);

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      toast({ title: 'Unsupported file', description: 'Please upload .xlsx or .xls', variant: 'destructive' });
      return;
    }
    setFile(f);
    parseFile(f);
  };

  const reset = () => {
    setFile(null);
    setParsed([]);
    setProgress({ done: 0, total: 0, success: 0, failed: 0 });
    if (inputRef.current) inputRef.current.value = '';
  };

  const totalValid = parsed.reduce((s, sh) => s + sh.rows.filter(r => r.valid).length, 0);
  const totalInvalid = parsed.reduce((s, sh) => s + sh.rows.filter(r => !r.valid).length, 0);

  const doImport = async () => {
    if (!user || totalValid === 0) return;
    setUploading(true);
    setProgress({ done: 0, total: totalValid, success: 0, failed: 0 });
    let success = 0, failed = 0, done = 0;

    for (const sheet of parsed) {
      const table = sheet.name.toLowerCase() as 'income' | 'expenses' | 'savings';
      for (const row of sheet.rows) {
        if (!row.valid) continue;
        const payload: any = { user_id: user.id, date: row.data.date, amount: row.data.amount };
        if (table === 'income') payload.source = String(row.data.source);
        if (table === 'expenses') {
          payload.expense_details = String(row.data.expense_details);
          payload.payment_mode = String(row.data.payment_mode);
        }
        if (table === 'savings' && row.data.details) payload.details = String(row.data.details);

        const { error } = await supabase.from(table).insert(payload);
        done++;
        if (error) failed++; else success++;
        setProgress({ done, total: totalValid, success, failed });
      }
    }

    setUploading(false);
    toast({
      title: failed === 0 ? '✅ Import complete' : 'Import finished with errors',
      description: `${success} added${failed ? `, ${failed} failed` : ''}.`,
      variant: failed && !success ? 'destructive' : 'default',
    });
    if (success > 0) setTimeout(reset, 1500);
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Upload Financial Data
            </CardTitle>
            <CardDescription className="mt-1">
              Drag & drop an Excel file, preview parsed rows, then import.
            </CardDescription>
          </div>
          <Button onClick={downloadTemplate} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Template
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Drop zone */}
        {!file && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
              dragging
                ? 'border-primary bg-primary/10 scale-[1.01]'
                : 'border-border/60 hover:border-primary/60 hover:bg-accent/40'
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className={cn('mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors', dragging ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary')}>
              <FileUp className="h-7 w-7" />
            </div>
            <p className="font-semibold text-foreground">
              {dragging ? 'Drop to preview' : 'Drag & drop your Excel file here'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or <span className="text-primary underline">browse</span> — .xlsx or .xls
            </p>
          </div>
        )}

        {/* File selected */}
        {file && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/40 border border-border/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={reset} disabled={uploading}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {parsing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Parsing file…
          </div>
        )}

        {/* Preview */}
        {parsed.length > 0 && !parsing && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-success" /> {totalValid} valid
              </Badge>
              {totalInvalid > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="h-3 w-3 text-destructive" /> {totalInvalid} with issues
                </Badge>
              )}
            </div>

            <Tabs defaultValue={parsed[0].name}>
              <TabsList>
                {parsed.map((s) => (
                  <TabsTrigger key={s.name} value={s.name}>
                    {s.name} ({s.rows.length})
                  </TabsTrigger>
                ))}
              </TabsList>
              {parsed.map((sheet) => (
                <TabsContent key={sheet.name} value={sheet.name}>
                  <div className="rounded-lg border border-border/60 overflow-hidden max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          {sheet.name === 'Income' && <TableHead>Source</TableHead>}
                          {sheet.name === 'Expenses' && <><TableHead>Details</TableHead><TableHead>Payment</TableHead></>}
                          {sheet.name === 'Savings' && <TableHead>Details</TableHead>}
                          <TableHead className="w-24">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sheet.rows.slice(0, 100).map((r) => (
                          <TableRow key={r.rowNumber} className={cn(!r.valid && 'bg-destructive/5')}>
                            <TableCell className="text-xs text-muted-foreground">{r.rowNumber}</TableCell>
                            <TableCell>{r.data.date || <span className="text-destructive text-xs">—</span>}</TableCell>
                            <TableCell>{isNaN(r.data.amount) ? <span className="text-destructive text-xs">—</span> : r.data.amount}</TableCell>
                            {sheet.name === 'Income' && <TableCell>{r.data.source || '—'}</TableCell>}
                            {sheet.name === 'Expenses' && <><TableCell>{r.data.expense_details || '—'}</TableCell><TableCell>{r.data.payment_mode || '—'}</TableCell></>}
                            {sheet.name === 'Savings' && <TableCell>{r.data.details || '—'}</TableCell>}
                            <TableCell>
                              {r.valid ? (
                                <Badge variant="outline" className="text-success border-success/40 gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> OK
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-destructive border-destructive/40 gap-1" title={r.errors.join(', ')}>
                                  <AlertCircle className="h-3 w-3" /> Fix
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {sheet.rows.length > 100 && (
                      <div className="text-xs text-muted-foreground text-center py-2 border-t">
                        Showing first 100 of {sheet.rows.length} rows
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Importing… {progress.done}/{progress.total}</span>
                  <span>{progress.success} added · {progress.failed} failed</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={reset} disabled={uploading}>Cancel</Button>
              <Button onClick={doImport} disabled={uploading || totalValid === 0} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import {totalValid} row{totalValid === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataUpload;
