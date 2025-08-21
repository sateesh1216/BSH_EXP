import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, DollarSign, TrendingUp, Fuel } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const StatsCards = () => {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [tripsResult, expensesResult] = await Promise.all([
        supabase
          .from('trips')
          .select('trip_amount, calculated_profit'),
        supabase
          .from('maintenance')
          .select('maintenance_cost')
      ]);

      const totalTrips = tripsResult.data?.length || 0;
      const totalTripMoney = tripsResult.data?.reduce((sum, trip) => sum + (trip.trip_amount || 0), 0) || 0;
      const totalProfit = tripsResult.data?.reduce((sum, trip) => sum + (trip.calculated_profit || 0), 0) || 0;
      const totalExpenses = expensesResult.data?.reduce((sum, expense) => sum + (expense.maintenance_cost || 0), 0) || 0;

      return {
        totalTrips,
        totalTripMoney,
        totalExpenses,
        totalProfit
      };
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
          <Car className="h-4 w-4 text-taxi-green" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalTrips || 0}</div>
          <p className="text-xs text-muted-foreground">Total completed trips</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Trip Money</CardTitle>
          <DollarSign className="h-4 w-4 text-taxi-blue" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-taxi-blue">
            {formatCurrency(stats?.totalTripMoney || 0)}
          </div>
          <p className="text-xs text-muted-foreground">Revenue from all trips</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <Fuel className="h-4 w-4 text-taxi-orange" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-taxi-orange">
            {formatCurrency(stats?.totalExpenses || 0)}
          </div>
          <p className="text-xs text-muted-foreground">Maintenance and fuel costs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
          <TrendingUp className="h-4 w-4 text-taxi-green" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-taxi-green">
            {formatCurrency(stats?.totalProfit || 0)}
          </div>
          <p className="text-xs text-muted-foreground">Net profit after expenses</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;