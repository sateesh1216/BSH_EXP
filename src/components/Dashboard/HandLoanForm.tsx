import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { sanitizeInput, validateAmount, validateDate, validateTextInput, checkRateLimit, rateLimitKey } from '@/lib/security';
import { HandCoins, TrendingUp, Trash2, CheckCircle, Clock, Edit2, Save, X, Plus, IndianRupee, ChevronDown, ChevronUp } from 'lucide-react';

const HandLoanForm = () => {
  const [borrowerName, setBorrowerName] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  // Status update dialog
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; loanId: string; currentStatus: string }>({ open: false, loanId: '', currentStatus: '' });

  // Repayment dialog
  const [repaymentDialog, setRepaymentDialog] = useState<{ open: boolean; loanId: string; loanAmount: number; totalRepaid: number }>({ open: false, loanId: '', loanAmount: 0, totalRepaid: 0 });
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentDate, setRepaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [repaymentNote, setRepaymentNote] = useState('');

  // Expanded rows to show repayment history
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  const { data: loans, isLoading } = useQuery({
    queryKey: ['hand-loans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hand_loans')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch all repayments for user's loans
  const { data: repayments } = useQuery({
    queryKey: ['loan-repayments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_repayments')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const getRepaymentsByLoan = (loanId: string) => {
    return repayments?.filter(r => r.loan_id === loanId) || [];
  };

  const getTotalRepaid = (loanId: string) => {
    return getRepaymentsByLoan(loanId).reduce((sum, r) => sum + Number(r.amount), 0);
  };

  const getRemainingBalance = (loan: any) => {
    return Number(loan.amount) - getTotalRepaid(loan.id);
  };

  const addLoanMutation = useMutation({
    mutationFn: async (loanData: { borrower_name: string; date: string; amount: number; interest_rate: number; due_date?: string }) => {
      const { data, error } = await supabase
        .from('hand_loans')
        .insert([{
          user_id: user?.id,
          borrower_name: loanData.borrower_name,
          date: loanData.date,
          amount: loanData.amount,
          interest_rate: loanData.interest_rate,
          interest_type: 'simple',
          due_date: loanData.due_date || null,
          status: 'pending',
        }])
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Hand loan added successfully!" });
      setBorrowerName('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setAmount('');
      setInterestRate('');
      setDueDate('');
      queryClient.invalidateQueries({ queryKey: ['hand-loans'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add hand loan", variant: "destructive" });
    },
  });

  const updateLoanMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from('hand_loans').update(updates).eq('id', id).eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Loan updated successfully!" });
      setEditingId(null);
      setEditData({});
      queryClient.invalidateQueries({ queryKey: ['hand-loans'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    },
  });

  const deleteLoanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hand_loans').delete().eq('id', id).eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Loan deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ['hand-loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan-repayments'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" });
    },
  });

  const addRepaymentMutation = useMutation({
    mutationFn: async (data: { loan_id: string; amount: number; date: string; note?: string }) => {
      const { error } = await supabase.from('loan_repayments').insert([{
        loan_id: data.loan_id,
        user_id: user?.id,
        amount: data.amount,
        date: data.date,
        note: data.note || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Repayment recorded!" });
      setRepaymentAmount('');
      setRepaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setRepaymentNote('');
      setRepaymentDialog({ open: false, loanId: '', loanAmount: 0, totalRepaid: 0 });
      queryClient.invalidateQueries({ queryKey: ['loan-repayments'] });
      queryClient.invalidateQueries({ queryKey: ['hand-loans'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add repayment", variant: "destructive" });
    },
  });

  const deleteRepaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loan_repayments').delete().eq('id', id).eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Repayment deleted!" });
      queryClient.invalidateQueries({ queryKey: ['loan-repayments'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete repayment", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !checkRateLimit(rateLimitKey(user.id, 'add_hand_loan'), 20, 60000)) {
      toast({ title: "Error", description: "Too many requests. Please wait.", variant: "destructive" });
      return;
    }

    const sanitizedName = sanitizeInput(borrowerName);
    const nameValidation = validateTextInput(sanitizedName, "Borrower's Name", 2, 100);
    if (!nameValidation.isValid) { toast({ title: "Error", description: nameValidation.error, variant: "destructive" }); return; }

    const dateValidation = validateDate(date);
    if (!dateValidation.isValid) { toast({ title: "Error", description: dateValidation.error, variant: "destructive" }); return; }

    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) { toast({ title: "Error", description: amountValidation.error, variant: "destructive" }); return; }

    const rate = parseFloat(interestRate) || 0;
    if (rate < 0 || rate > 100) { toast({ title: "Error", description: "Interest rate must be between 0 and 100", variant: "destructive" }); return; }

    addLoanMutation.mutate({
      borrower_name: sanitizedName,
      date,
      amount: parseFloat(amount),
      interest_rate: rate,
      due_date: dueDate || undefined,
    });
  };

  const handleAddRepayment = () => {
    const repayAmt = parseFloat(repaymentAmount);
    const remaining = repaymentDialog.loanAmount - repaymentDialog.totalRepaid;
    if (!repayAmt || repayAmt <= 0) {
      toast({ title: "Error", description: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (repayAmt > remaining) {
      toast({ title: "Error", description: `Amount exceeds remaining balance of ${formatCurrency(remaining)}`, variant: "destructive" });
      return;
    }
    addRepaymentMutation.mutate({
      loan_id: repaymentDialog.loanId,
      amount: repayAmt,
      date: repaymentDate,
      note: repaymentNote,
    });
  };

  // Interest calculated on REMAINING balance (minimum 1 day)
  const calculateLoanInterest = (loan: any) => {
    if (!loan.interest_rate || loan.interest_rate === 0) return 0;
    const loanDate = new Date(loan.date);
    const endDate = new Date();
    const days = Math.max(differenceInDays(endDate, loanDate), 1);
    const timeInYears = days / 365;
    const remainingBalance = getRemainingBalance(loan);
    return (remainingBalance * loan.interest_rate * timeInYears) / 100;
  };

  const handleStatusChange = (loanId: string, newStatus: string) => {
    updateLoanMutation.mutate({ id: loanId, updates: { status: newStatus } });
    setStatusDialog({ open: false, loanId: '', currentStatus: '' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const totalLoanGiven = loans?.reduce((sum, loan) => sum + Number(loan.amount), 0) || 0;
  const totalRepaidAll = loans?.reduce((sum, loan) => sum + getTotalRepaid(loan.id), 0) || 0;
  const pendingLoans = loans?.filter(l => l.status === 'pending') || [];
  const returnedLoans = loans?.filter(l => l.status === 'returned') || [];
  const totalPending = loans?.reduce((sum, loan) => sum + getRemainingBalance(loan), 0) || 0;
  const totalInterestEarned = loans?.reduce((sum, loan) => sum + calculateLoanInterest(loan), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20 shadow-card hover-lift animate-fade-in backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Loan Given</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full">
              <HandCoins className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary mb-1">{formatCurrency(totalLoanGiven)}</div>
            <p className="text-xs text-muted-foreground">{loans?.length || 0} total loans</p>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/20 shadow-card hover-lift animate-fade-in [animation-delay:0.1s] backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Repaid</CardTitle>
            <div className="p-2 bg-success/10 rounded-full">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success mb-1">{formatCurrency(totalRepaidAll)}</div>
            <p className="text-xs text-muted-foreground">Amount received back</p>
          </CardContent>
        </Card>

        <Card className="bg-warning/5 border-warning/20 shadow-card hover-lift animate-fade-in [animation-delay:0.2s] backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining Balance</CardTitle>
            <div className="p-2 bg-warning/10 rounded-full">
              <Clock className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning mb-1">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground">{pendingLoans.length} pending loans</p>
          </CardContent>
        </Card>

        <Card className="bg-expense-blue/5 border-expense-blue/20 shadow-card hover-lift animate-fade-in [animation-delay:0.3s] backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Interest on Balance</CardTitle>
            <div className="p-2 bg-expense-blue/10 rounded-full">
              <TrendingUp className="h-4 w-4 text-expense-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-expense-blue mb-1">{formatCurrency(totalInterestEarned)}</div>
            <p className="text-xs text-muted-foreground">On remaining balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Loan Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-primary" />
            Add Hand Loan
          </CardTitle>
          <CardDescription>Record a new hand loan given to someone</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="borrower">Borrower's Name</Label>
                <Input id="borrower" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} placeholder="e.g., John Doe" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loan-date">Date</Label>
                <Input id="loan-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loan-amount">Amount (₹)</Label>
                <Input id="loan-amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                <Input id="interest-rate" type="number" step="0.01" min="0" max="100" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-date">Due Date (Optional)</Label>
                <Input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addLoanMutation.isPending}>
              {addLoanMutation.isPending ? 'Adding...' : 'Add Hand Loan'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Loan Records</CardTitle>
          <CardDescription>{loans?.length || 0} total records</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : !loans?.length ? (
            <p className="text-center text-muted-foreground py-8">No hand loans recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Loan Amt</TableHead>
                    <TableHead>Repaid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Rate %</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => {
                    const totalRepaid = getTotalRepaid(loan.id);
                    const remaining = getRemainingBalance(loan);
                    const interest = calculateLoanInterest(loan);
                    const isEditing = editingId === loan.id;
                    const isExpanded = expandedLoanId === loan.id;
                    const loanRepayments = getRepaymentsByLoan(loan.id);

                    return (
                      <React.Fragment key={loan.id}>
                        <TableRow className={isExpanded ? 'border-b-0' : ''}>
                          <TableCell>
                            {isEditing ? (
                              <Input value={editData.borrower_name || ''} onChange={(e) => setEditData({ ...editData, borrower_name: e.target.value })} className="w-32" />
                            ) : (
                              <span className="font-medium">{loan.borrower_name}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input type="date" value={editData.date || ''} onChange={(e) => setEditData({ ...editData, date: e.target.value })} className="w-36" />
                            ) : (
                              format(new Date(loan.date), 'dd/MM/yyyy')
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input type="number" value={editData.amount || ''} onChange={(e) => setEditData({ ...editData, amount: e.target.value })} className="w-28" />
                            ) : (
                              formatCurrency(loan.amount)
                            )}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-success border-success/30" onClick={() => {
                              setRepaymentDialog({ open: true, loanId: loan.id, loanAmount: Number(loan.amount), totalRepaid });
                            }}>
                              <IndianRupee className="h-3 w-3" /> {formatCurrency(totalRepaid)}
                            </Button>
                          </TableCell>
                          <TableCell className="text-warning font-semibold">
                            {formatCurrency(remaining)}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input type="number" value={editData.interest_rate || ''} onChange={(e) => setEditData({ ...editData, interest_rate: e.target.value })} className="w-20" />
                            ) : (
                              `${loan.interest_rate}%`
                            )}
                          </TableCell>
                          <TableCell className="text-expense-blue font-medium">
                            {formatCurrency(interest)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={loan.status === 'returned' ? 'default' : 'secondary'}
                              className={`cursor-pointer ${loan.status === 'returned' ? 'bg-success/20 text-success hover:bg-success/30' : 'bg-warning/20 text-warning hover:bg-warning/30'}`}
                              onClick={() => setStatusDialog({ open: true, loanId: loan.id, currentStatus: loan.status })}
                            >
                              {loan.status === 'returned' ? 'Returned' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isEditing ? (
                                <>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                                    updateLoanMutation.mutate({
                                      id: loan.id,
                                      updates: {
                                        borrower_name: editData.borrower_name,
                                        date: editData.date,
                                        amount: parseFloat(editData.amount),
                                        interest_rate: parseFloat(editData.interest_rate) || 0,
                                        due_date: editData.due_date || null,
                                      }
                                    });
                                  }}>
                                    <Save className="h-4 w-4 text-success" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(null); setEditData({}); }}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  
                                  {loanRepayments.length > 0 && (
                                    <Button size="icon" variant="ghost" className="h-8 w-8" title="View Repayments" onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}>
                                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                  )}
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                                    setEditingId(loan.id);
                                    setEditData({
                                      borrower_name: loan.borrower_name,
                                      date: loan.date,
                                      amount: loan.amount,
                                      interest_rate: loan.interest_rate,
                                      due_date: loan.due_date || '',
                                    });
                                  }}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteLoanMutation.mutate(loan.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Repayment history sub-rows */}
                        {isExpanded && loanRepayments.map((rep) => (
                          <TableRow key={rep.id} className="bg-muted/30">
                            <TableCell colSpan={2} className="pl-8 text-xs text-muted-foreground">
                              ↳ Repayment on {format(new Date(rep.date), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="text-xs" />
                            <TableCell className="text-xs text-success font-medium">
                              {formatCurrency(Number(rep.amount))}
                            </TableCell>
                            <TableCell colSpan={3} className="text-xs text-muted-foreground">
                              {rep.note || '-'}
                            </TableCell>
                            <TableCell />
                            <TableCell>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteRepaymentMutation.mutate(rep.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <Dialog open={statusDialog.open} onOpenChange={(open) => setStatusDialog({ ...statusDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Loan Status</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Mark this loan as {statusDialog.currentStatus === 'pending' ? 'returned' : 'pending'}?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog({ open: false, loanId: '', currentStatus: '' })}>Cancel</Button>
            <Button onClick={() => handleStatusChange(statusDialog.loanId, statusDialog.currentStatus === 'pending' ? 'returned' : 'pending')}>
              {statusDialog.currentStatus === 'pending' ? 'Mark as Returned' : 'Mark as Pending'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Repayment Dialog */}
      <Dialog open={repaymentDialog.open} onOpenChange={(open) => setRepaymentDialog({ ...repaymentDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Repayment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Loan Amount:</div>
              <div className="font-semibold">{formatCurrency(repaymentDialog.loanAmount)}</div>
              <div className="text-muted-foreground">Already Repaid:</div>
              <div className="font-semibold text-success">{formatCurrency(repaymentDialog.totalRepaid)}</div>
              <div className="text-muted-foreground">Remaining:</div>
              <div className="font-semibold text-warning">{formatCurrency(repaymentDialog.loanAmount - repaymentDialog.totalRepaid)}</div>
            </div>
            <div className="space-y-2">
              <Label>Repayment Amount (₹)</Label>
              <Input type="number" step="0.01" min="0" value={repaymentAmount} onChange={(e) => setRepaymentAmount(e.target.value)} placeholder="Enter amount received" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={repaymentDate} onChange={(e) => setRepaymentDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Note (Optional)</Label>
              <Input value={repaymentNote} onChange={(e) => setRepaymentNote(e.target.value)} placeholder="e.g., Partial payment" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepaymentDialog({ open: false, loanId: '', loanAmount: 0, totalRepaid: 0 })}>Cancel</Button>
            <Button onClick={handleAddRepayment} disabled={addRepaymentMutation.isPending}>
              {addRepaymentMutation.isPending ? 'Saving...' : 'Add Repayment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HandLoanForm;
