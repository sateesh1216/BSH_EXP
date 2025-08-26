import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Edit, Trash2, Save, X } from 'lucide-react';

interface EditableDataTableProps {
  type: 'income' | 'expenses' | 'savings';
  selectedMonth: string;
  selectedYear: string;
}

const EditableDataTable = ({ type, selectedMonth, selectedYear }: EditableDataTableProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  // Calculate date range based on filters
  const getDateRange = () => {
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
    queryKey: [type, selectedYear, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(type)
        .select('*')
        .eq('user_id', user?.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from(type)
        .update(updates)
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
  };

  const handleSave = () => {
    if (!editingId) return;
    
    const updates = { ...editData };
    delete updates.id;
    delete updates.user_id;
    delete updates.created_at;
    delete updates.updated_at;
    
    updateMutation.mutate({ id: editingId, updates });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = (id: string) => {
    if (confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const getTableTitle = () => {
    const monthName = selectedMonth === 'all' ? 'All Months' : 
      format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM');
    return `${type.charAt(0).toUpperCase() + type.slice(1)} - ${monthName} ${selectedYear}`;
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
                          <Input
                            value={editData.expense_details || ''}
                            onChange={(e) => setEditData({ ...editData, expense_details: e.target.value })}
                            className="min-w-[150px]"
                          />
                        ) : (
                          <span className="font-medium">{(item as any).expense_details}</span>
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