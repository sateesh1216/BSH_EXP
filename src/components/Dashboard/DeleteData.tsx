import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

const DeleteData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear + 2 - i);
  
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

  const dataTypes = [
    { id: 'income', label: 'Income Records', color: 'text-expense-green' },
    { id: 'expenses', label: 'Expense Records', color: 'text-expense-red' },
    { id: 'savings', label: 'Savings Records', color: 'text-expense-blue' },
  ];

  const getDateRange = () => {
    if (selectedYear === 'all') {
      return { start: null, end: null };
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

  const getFilterDescription = () => {
    if (selectedYear === 'all') return 'all time';
    if (selectedMonth === 'all') return `year ${selectedYear}`;
    const monthName = months.find(m => m.value === selectedMonth)?.label;
    return `${monthName} ${selectedYear}`;
  };

  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTypes.length === dataTypes.length) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(dataTypes.map(t => t.id));
    }
  };

  const deleteSelectedData = async () => {
    if (!user?.id || selectedTypes.length === 0) return;

    const { start, end } = getDateRange();
    setIsDeleting(true);
    
    try {
      const deletePromises = selectedTypes.map(async (type) => {
        let query = supabase
          .from(type as 'income' | 'expenses' | 'savings')
          .delete()
          .eq('user_id', user.id);
        
        // Apply date filters if not "all"
        if (start && end) {
          query = query.gte('date', start).lte('date', end);
        }
        
        const { error } = await query;
        if (error) throw error;
        return type;
      });

      await Promise.all(deletePromises);

      toast({
        title: "Data Deleted",
        description: `Successfully deleted ${selectedTypes.join(', ')} records for ${getFilterDescription()}.`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries();

      setSelectedTypes([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete data",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteAllData = async () => {
    if (!user?.id) return;

    setIsDeleting(true);
    try {
      const allTypes = ['income', 'expenses', 'savings'] as const;
      
      const deletePromises = allTypes.map(async (type) => {
        const { error } = await supabase
          .from(type)
          .delete()
          .eq('user_id', user.id);
        
        if (error) throw error;
        return type;
      });

      await Promise.all(deletePromises);

      toast({
        title: "All Data Deleted",
        description: "Successfully deleted all your financial records.",
      });

      // Invalidate all queries
      queryClient.invalidateQueries();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete data",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Delete All Data */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete All Data
          </CardTitle>
          <CardDescription>
            Permanently delete all your income, expenses, and savings records. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <strong>ALL</strong> your financial records including:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>All income records</li>
                    <li>All expense records</li>
                    <li>All savings records</li>
                  </ul>
                  <p className="mt-3 text-destructive font-medium">
                    This action cannot be undone!
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={deleteAllData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, Delete Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Selective Delete with Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Selective Delete by Date
          </CardTitle>
          <CardDescription>
            Choose time period and data types to delete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-sm font-medium mb-2 block">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Month</Label>
              <Select 
                value={selectedMonth} 
                onValueChange={setSelectedMonth}
                disabled={selectedYear === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data Type Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Select Data Types</Label>
            <div className="flex items-center space-x-2 pb-2 border-b mb-3">
              <Checkbox
                id="select-all"
                checked={selectedTypes.length === dataTypes.length}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="font-medium cursor-pointer">
                Select All
              </Label>
            </div>

            <div className="space-y-3">
              {dataTypes.map((type) => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={type.id}
                    checked={selectedTypes.includes(type.id)}
                    onCheckedChange={() => handleTypeToggle(type.id)}
                  />
                  <Label htmlFor={type.id} className={`cursor-pointer ${type.color}`}>
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Delete Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={selectedTypes.length === 0 || isDeleting}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected for {getFilterDescription()}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Confirm Deletion
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to delete the following data for <strong>{getFilterDescription()}</strong>:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {selectedTypes.map(type => (
                      <li key={type} className="capitalize">{type} records</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-destructive font-medium">
                    This action cannot be undone!
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={deleteSelectedData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, Delete Selected
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeleteData;
