import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const DeleteData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const dataTypes = [
    { id: 'income', label: 'Income Records', color: 'text-expense-green' },
    { id: 'expenses', label: 'Expense Records', color: 'text-expense-red' },
    { id: 'savings', label: 'Savings Records', color: 'text-expense-blue' },
  ];

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

    setIsDeleting(true);
    try {
      const deletePromises = selectedTypes.map(async (type) => {
        const { error } = await supabase
          .from(type as 'income' | 'expenses' | 'savings')
          .delete()
          .eq('user_id', user.id);
        
        if (error) throw error;
        return type;
      });

      await Promise.all(deletePromises);

      toast({
        title: "Data Deleted",
        description: `Successfully deleted ${selectedTypes.join(', ')} records.`,
      });

      // Invalidate queries to refresh data
      selectedTypes.forEach(type => {
        queryClient.invalidateQueries({ queryKey: [type] });
      });
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });

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
      allTypes.forEach(type => {
        queryClient.invalidateQueries({ queryKey: [type] });
      });
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });

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

      {/* Selective Delete */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-muted-foreground" />
            Selective Delete
          </CardTitle>
          <CardDescription>
            Choose which types of data you want to delete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b">
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

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={selectedTypes.length === 0 || isDeleting}
                className="mt-4"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedTypes.length})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Confirm Deletion
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to delete the following data:
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
