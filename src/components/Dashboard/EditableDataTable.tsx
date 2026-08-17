import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Edit, Trash2, Save, X, FileText, Download, XCircle, Bell, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface EditableDataTableProps {
  type: 'income' | 'expenses' | 'savings';
  selectedMonth: string;
  selectedYear: string;
  searchTerm?: string;
  startDate?: Date;
  endDate?: Date;
}

const EditableDataTable = ({ type, selectedMonth, selectedYear, searchTerm, startDate, endDate }: EditableDataTableProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [warrantyFile, setWarrantyFile] = useState<File | null>(null);
  const [reminderConfirmItem, setReminderConfirmItem] = useState<any>(null);
  const [showRemindersPanel, setShowRemindersPanel] = useState(false);

  // The expense-attachments bucket is private; resolve a short-lived signed URL
  // on click rather than relying on long-lived public URLs.
  const openAttachment = async (fileUrl: string) => {
    if (!fileUrl) return;
    try {
      const parts = fileUrl.split('/expense-attachments/');
      const filePath = parts.length > 1 ? parts[1] : fileUrl;
      const { data, error } = await supabase.storage
        .from('expense-attachments')
        .createSignedUrl(filePath, 60);
      if (error || !data?.signedUrl) throw error ?? new Error('No signed URL');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast({
        title: 'Unable to open file',
        description: err?.message || 'Could not generate a secure link.',
        variant: 'destructive',
      });
    }
  };

  // Fetch existing reminders for this user
  const { data: existingReminders } = useQuery({
    queryKey: ['recurring-reminders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_reminders')
        .select('*')
        .eq('user_id', user?.id)
        .order('day_of_month', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate date range based on filters
  const getDateRange = () => {
    // If custom date range is provided (for expenses), use it
    if (type === 'expenses' && (startDate || endDate)) {
      return {
        start: startDate ? format(startDate, 'yyyy-MM-dd') : '2020-01-01',
        end: endDate ? format(endDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
      };
    }

    if (selectedYear === 'all') {
      // Show all available data
      return {
        start: '2020-01-01', // Start from a reasonable past date
        end: format(new Date(), 'yyyy-MM-dd') // End at today
      };
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

  const { start, end } = getDateRange();

  const { data, isLoading } = useQuery({
    queryKey: [type, selectedYear, selectedMonth, searchTerm, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from(type)
        .select('*')
        .eq('user_id', user?.id)
        .gte('date', start)
        .lte('date', end);

      // Add search filter per type
      if (searchTerm && searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        if (type === 'expenses') query = query.ilike('expense_details', term);
        else if (type === 'income') query = query.ilike('source', term);
        else if (type === 'savings') query = query.ilike('details', term);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates, billFile, warrantyFile }: { id: string; updates: any; billFile?: File | null; warrantyFile?: File | null }) => {
      let updatedData = { ...updates };

      // Upload bill file if provided
      if (billFile && user?.id) {
        const fileExt = billFile.name.split('.').pop();
        const fileName = `${user.id}/bills/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('expense-attachments')
          .upload(fileName, billFile);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('expense-attachments')
          .getPublicUrl(fileName);
        
        updatedData.attachment_url = publicUrl;
      }

      // Upload warranty file if provided
      if (warrantyFile && user?.id) {
        const fileExt = warrantyFile.name.split('.').pop();
        const fileName = `${user.id}/warranties/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('expense-attachments')
          .upload(fileName, warrantyFile);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('expense-attachments')
          .getPublicUrl(fileName);
        
        updatedData.warranty_url = publicUrl;
      }

      const { data, error } = await supabase
        .from(type)
        .update(updatedData)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully!`,
      });
      setEditingId(null);
      setEditData({});
      setBillFile(null);
      setWarrantyFile(null);
      queryClient.invalidateQueries({ queryKey: [type] });
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to update ${type}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(type)
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: [type] });
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to delete ${type}`,
        variant: "destructive",
      });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async ({ id, attachmentType }: { id: string; attachmentType: 'bill' | 'warranty' }) => {
      const urlField = attachmentType === 'bill' ? 'attachment_url' : 'warranty_url';
      
      // Get the current record to find the file path
      const { data: record, error: fetchError } = await supabase
        .from('expenses')
        .select(urlField)
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (fetchError) throw fetchError;

      const fileUrl = record?.[urlField];
      if (fileUrl) {
        // Extract file path from URL
        const urlParts = fileUrl.split('/expense-attachments/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          // Delete from storage
          const { error: storageError } = await supabase.storage
            .from('expense-attachments')
            .remove([filePath]);
          
          if (storageError) console.warn('Storage deletion warning:', storageError);
        }
      }

      // Update the record to remove the URL
      const { error } = await supabase
        .from('expenses')
        .update({ [urlField]: null })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: (_, { attachmentType }) => {
      toast({
        title: "Success",
        description: `${attachmentType === 'bill' ? 'Bill' : 'Warranty'} attachment deleted successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: [type] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete attachment",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAttachment = (id: string, attachmentType: 'bill' | 'warranty') => {
    if (confirm(`Are you sure you want to delete this ${attachmentType === 'bill' ? 'bill' : 'warranty'} attachment?`)) {
      deleteAttachmentMutation.mutate({ id, attachmentType });
    }
  };

  const addReminderMutation = useMutation({
    mutationFn: async (item: any) => {
      const label = type === 'expenses' ? item.expense_details : item.details;
      const dayOfMonth = new Date(item.date).getDate();
      const reminderType = type === 'expenses' 
        ? (label?.toLowerCase().includes('emi') ? 'EMI' : 'bill')
        : (label?.toLowerCase().includes('sip') ? 'SIP' : 'investment');

      const { error } = await supabase
        .from('recurring_reminders')
        .insert([{
          user_id: user?.id,
          label,
          type: reminderType,
          day_of_month: dayOfMonth,
          is_active: true,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Reminder Added",
        description: "Recurring reminder created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['recurring-reminders'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add reminder",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatPaymentMode = (mode: string) => {
    const modeMap: Record<string, string> = {
      'debit_card': 'Debit Card',
      'credit_card': 'Credit Card',
      'upi': 'UPI',
      'cash': 'Cash',
      'auto_debit': 'Auto Debit',
      'online_banking': 'Online Banking',
      'card': 'Debit Card', // Legacy value mapping
    };
    return modeMap[mode] || mode;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const handleRowClick = (item: any) => {
    if (isMobile && editingId !== item.id) {
      setSelectedItem(item);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditData({ ...item });
    setBillFile(null);
    setWarrantyFile(null);
  };

  const handleSave = () => {
    if (!editingId) return;

    // Validate file types and sizes if provided
    if (billFile) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(billFile.type)) {
        toast({
          title: "Error",
          description: "Bill: Only JPG, PNG, WEBP, and PDF files are allowed",
          variant: "destructive",
        });
        return;
      }
      if (billFile.size > 5242880) { // 5MB
        toast({
          title: "Error",
          description: "Bill: File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
    }

    if (warrantyFile) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(warrantyFile.type)) {
        toast({
          title: "Error",
          description: "Warranty: Only JPG, PNG, WEBP, and PDF files are allowed",
          variant: "destructive",
        });
        return;
      }
      if (warrantyFile.size > 5242880) { // 5MB
        toast({
          title: "Error",
          description: "Warranty: File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
    }
    
    const updates = { ...editData };
    delete updates.id;
    delete updates.user_id;
    delete updates.created_at;
    delete updates.updated_at;
    delete updates.attachment_url;
    delete updates.warranty_url;
    
    updateMutation.mutate({ id: editingId, updates, billFile, warrantyFile });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
    setBillFile(null);
    setWarrantyFile(null);
  };

  const handleDelete = (id: string) => {
    if (confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const getTableTitle = () => {
    const yearText = selectedYear === 'all' ? 'All Years' : selectedYear;
    const monthName = selectedMonth === 'all' ? 'All Months' : 
      format(new Date(parseInt(selectedYear === 'all' ? '2024' : selectedYear), parseInt(selectedMonth) - 1), 'MMMM');
    return `${type.charAt(0).toUpperCase() + type.slice(1)} - ${monthName} ${yearText}`;
  };

  const getColorClass = () => {
    switch (type) {
      case 'income': return 'text-expense-green';
      case 'expenses': return 'text-expense-red';
      case 'savings': return 'text-expense-blue';
      default: return 'text-primary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className={`text-lg font-semibold ${getColorClass()}`}>
          {getTableTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {type === 'income' && (
                <>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </>
              )}
              {type === 'expenses' && (
                <>
                  <TableHead>Expense Details</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </>
              )}
              {type === 'savings' && (
                <>
                  <TableHead>Saving Details</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </>
              )}
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data && data.length > 0 ? (
              data.map((item) => (
                <TableRow key={item.id}>
                  {type === 'income' && (
                    <>
                      <TableCell>
                      {editingId === item.id ? (
                          <Input
                            value={editData.source || ''}
                            onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                            className="min-w-[150px]"
                          />
                        ) : (
                          <span className="font-medium">{(item as any).source}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <Input
                            type="date"
                            value={editData.date || ''}
                            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                          />
                        ) : (
                          formatDate(item.date)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === item.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editData.amount || ''}
                            onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })}
                            className="text-right"
                          />
                        ) : (
                          <span className="text-expense-green font-semibold">
                            {formatCurrency(item.amount)}
                          </span>
                        )}
                      </TableCell>
                    </>
                  )}
                  
                  {type === 'expenses' && (
                    <>
                      <TableCell>
                        {editingId === item.id ? (
                          <div className="space-y-2 min-w-[200px]">
                            <Input
                              value={editData.expense_details || ''}
                              onChange={(e) => setEditData({ ...editData, expense_details: e.target.value })}
                              placeholder="Expense details"
                            />
                            <div className="space-y-1">
                              <Label className="text-xs">Bill</Label>
                              <Input
                                type="file"
                                accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                                onChange={(e) => setBillFile(e.target.files?.[0] || null)}
                                className="cursor-pointer text-xs h-8"
                              />
                              {(item as any).attachment_url && (
                                <button
                                  type="button"
                                  onClick={() => openAttachment((item as any).attachment_url)}
                                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <FileText className="h-3 w-3" />
                                  Current Bill
                                </button>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Warranty</Label>
                              <Input
                                type="file"
                                accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                                onChange={(e) => setWarrantyFile(e.target.files?.[0] || null)}
                                className="cursor-pointer text-xs h-8"
                              />
                              {(item as any).warranty_url && (
                                <button
                                  type="button"
                                  onClick={() => openAttachment((item as any).warranty_url)}
                                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <FileText className="h-3 w-3" />
                                  Current Warranty
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <span className="font-medium block">{(item as any).expense_details}</span>
                            <div className="flex flex-wrap gap-2">
                              {(item as any).attachment_url && (
                                <div className="inline-flex items-center gap-1 bg-primary/10 rounded-md">
                                  <button
                                    type="button"
                                    onClick={() => openAttachment((item as any).attachment_url)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 rounded-l-md transition-colors"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    View Bill
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAttachment(item.id, 'bill')}
                                    className="inline-flex items-center px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-r-md transition-colors"
                                    title="Delete Bill"
                                    disabled={deleteAttachmentMutation.isPending}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                              {(item as any).warranty_url && (
                                <div className="inline-flex items-center gap-1 bg-secondary rounded-md">
                                  <button
                                    type="button"
                                    onClick={() => openAttachment((item as any).warranty_url)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 rounded-l-md transition-colors"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    View Warranty
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAttachment(item.id, 'warranty')}
                                    className="inline-flex items-center px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-r-md transition-colors"
                                    title="Delete Warranty"
                                    disabled={deleteAttachmentMutation.isPending}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <Input
                            type="date"
                            value={editData.date || ''}
                            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                          />
                        ) : (
                          formatDate(item.date)
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <Select 
                            value={editData.payment_mode || ''} 
                            onValueChange={(value) => setEditData({ ...editData, payment_mode: value })}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="debit_card">Debit Card</SelectItem>
                              <SelectItem value="credit_card">Credit Card</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="auto_debit">Auto Debit</SelectItem>
                              <SelectItem value="online_banking">Online Banking</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="capitalize bg-secondary px-2 py-1 rounded text-xs">
                            {formatPaymentMode((item as any).payment_mode)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === item.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editData.amount || ''}
                            onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })}
                            className="text-right"
                          />
                        ) : (
                          <span className="text-expense-red font-semibold">
                            {formatCurrency(item.amount)}
                          </span>
                        )}
                      </TableCell>
                    </>
                  )}
                  
                  {type === 'savings' && (
                    <>
                      <TableCell>
                      {editingId === item.id ? (
                          <Input
                            value={editData.details || ''}
                            onChange={(e) => setEditData({ ...editData, details: e.target.value })}
                            className="min-w-[150px]"
                          />
                        ) : (
                          <span className="font-medium">{(item as any).details || 'N/A'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <Input
                            type="date"
                            value={editData.date || ''}
                            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                          />
                        ) : (
                          formatDate(item.date)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === item.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editData.amount || ''}
                            onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })}
                            className="text-right"
                          />
                        ) : (
                          <span className="text-expense-blue font-semibold">
                            {formatCurrency(item.amount)}
                          </span>
                        )}
                      </TableCell>
                    </>
                  )}
                  
                  <TableCell className="text-center">
                    {editingId === item.id ? (
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSave}
                          disabled={updateMutation.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancel}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {(type === 'expenses' || type === 'savings') && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setReminderConfirmItem(item)}
                                  disabled={addReminderMutation.isPending}
                                >
                                  <Bell className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Add as recurring reminder</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={type === 'expenses' ? 5 : 4} className="text-center text-muted-foreground py-8">
                  No {type} records for this period
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Show All Reminders Toggle */}
      {(type === 'expenses' || type === 'savings') && (
        <CardContent className="pt-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-muted-foreground"
            onClick={() => setShowRemindersPanel(!showRemindersPanel)}
          >
            <Bell className="h-4 w-4" />
            {showRemindersPanel ? 'Hide Reminders' : `Show All Reminders (${existingReminders?.length || 0})`}
          </Button>
          {showRemindersPanel && (
            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
              {!existingReminders?.length ? (
                <p className="text-sm text-muted-foreground text-center py-3">No reminders set yet.</p>
              ) : (
                existingReminders.map((r) => (
                  <div key={r.id} className={`flex items-center justify-between p-2 border rounded-lg text-sm ${!r.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">{r.type}</span>
                      <span className="truncate">{r.label}</span>
                      <span className="text-xs text-muted-foreground shrink-0">Day {r.day_of_month}</span>
                    </div>
                    {!r.is_active && <span className="text-xs italic text-muted-foreground shrink-0">Paused</span>}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!reminderConfirmItem} onOpenChange={(open) => !open && setReminderConfirmItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Add Recurring Reminder
            </DialogTitle>
            <DialogDescription>
              This will create a recurring reminder for:
            </DialogDescription>
          </DialogHeader>
          {reminderConfirmItem && (
            <div className="space-y-2 py-2">
              <div className="p-3 border rounded-lg bg-muted/50 space-y-1">
                <p className="font-medium">
                  {type === 'expenses' ? reminderConfirmItem.expense_details : reminderConfirmItem.details}
                </p>
                <p className="text-sm text-muted-foreground">
                  Day <strong>{new Date(reminderConfirmItem.date).getDate()}</strong> of every month
                </p>
                <p className="text-sm text-muted-foreground">
                  Type: <strong>{type === 'expenses' 
                    ? (reminderConfirmItem.expense_details?.toLowerCase().includes('emi') ? 'EMI' : 'Bill')
                    : (reminderConfirmItem.details?.toLowerCase().includes('sip') ? 'SIP' : 'Investment')}</strong>
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReminderConfirmItem(null)}>Cancel</Button>
            <Button
              onClick={() => {
                addReminderMutation.mutate(reminderConfirmItem);
                setReminderConfirmItem(null);
              }}
              disabled={addReminderMutation.isPending}
              className="gap-1.5"
            >
              <Bell className="h-4 w-4" /> Confirm Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EditableDataTable;