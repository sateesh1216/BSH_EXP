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
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Edit, Trash2, Save, X, FileText, Download } from 'lucide-react';

interface EditableDataTableProps {
  type: 'income' | 'expenses' | 'savings';
  selectedMonth: string;
  selectedYear: string;
  searchTerm?: string;
}

const EditableDataTable = ({ type, selectedMonth, selectedYear, searchTerm }: EditableDataTableProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [billFile, setBillFile] = useState<File | null>(null);
  const [warrantyFile, setWarrantyFile] = useState<File | null>(null);

  // Calculate date range based on filters
  const getDateRange = () => {
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
    queryKey: [type, selectedYear, selectedMonth, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from(type)
        .select('*')
        .eq('user_id', user?.id)
        .gte('date', start)
        .lte('date', end);

      // Add search filter for expenses
      if (type === 'expenses' && searchTerm && searchTerm.trim()) {
        query = query.ilike('expense_details', `%${searchTerm.trim()}%`);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
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
                                <a 
                                  href={(item as any).attachment_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <FileText className="h-3 w-3" />
                                  Current Bill
                                </a>
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
                                <a 
                                  href={(item as any).warranty_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <FileText className="h-3 w-3" />
                                  Current Warranty
                                </a>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <span className="font-medium block">{(item as any).expense_details}</span>
                            <div className="flex flex-wrap gap-2">
                              {(item as any).attachment_url && (
                                <a 
                                  href={(item as any).attachment_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  View Bill
                                </a>
                              )}
                              {(item as any).warranty_url && (
                                <a 
                                  href={(item as any).warranty_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  View Warranty
                                </a>
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
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="capitalize bg-secondary px-2 py-1 rounded text-xs">
                            {(item as any).payment_mode}
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
    </Card>
  );
};

export default EditableDataTable;