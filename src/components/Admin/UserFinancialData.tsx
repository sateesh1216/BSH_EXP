import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminApi } from '@/hooks/useAdminApi';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';

interface UserFinancialDataProps {
  userId: string;
}

const UserFinancialData = ({ userId }: UserFinancialDataProps) => {
  const { getUserFinancialData } = useAdminApi();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-financial', userId],
    queryFn: () => getUserFinancialData(userId),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const totalIncome = data?.income?.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0) || 0;
  const totalExpenses = data?.expenses?.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0) || 0;
  const totalSavings = data?.savings?.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0) || 0;

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-expense-green/10">
                <TrendingUp className="h-5 w-5 text-expense-green" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-xl font-bold text-expense-green">{formatCurrency(totalIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-expense-red/10">
                <TrendingDown className="h-5 w-5 text-expense-red" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-xl font-bold text-expense-red">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-expense-blue/10">
                <PiggyBank className="h-5 w-5 text-expense-blue" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Savings</p>
                <p className="text-xl font-bold text-expense-blue">{formatCurrency(totalSavings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Tabs */}
      <Tabs defaultValue="income">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="income">Income ({data?.income?.length || 0})</TabsTrigger>
          <TabsTrigger value="expenses">Expenses ({data?.expenses?.length || 0})</TabsTrigger>
          <TabsTrigger value="savings">Savings ({data?.savings?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle>Income Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.income?.slice(0, 20).map((item: { id: string; date: string; source: string; amount: number }) => (
                    <TableRow key={item.id}>
                      <TableCell>{format(new Date(item.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{item.source}</TableCell>
                      <TableCell className="text-right text-expense-green font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.income || data.income.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No income records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Expense Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.expenses?.slice(0, 20).map((item: { id: string; date: string; expense_details: string; payment_mode: string; amount: number }) => (
                    <TableRow key={item.id}>
                      <TableCell>{format(new Date(item.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{item.expense_details}</TableCell>
                      <TableCell>{item.payment_mode}</TableCell>
                      <TableCell className="text-right text-expense-red font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.expenses || data.expenses.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No expense records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="savings">
          <Card>
            <CardHeader>
              <CardTitle>Savings Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.savings?.slice(0, 20).map((item: { id: string; date: string; details: string; amount: number }) => (
                    <TableRow key={item.id}>
                      <TableCell>{format(new Date(item.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{item.details}</TableCell>
                      <TableCell className="text-right text-expense-blue font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.savings || data.savings.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No savings records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserFinancialData;