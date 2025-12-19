import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, LogIn, Activity } from 'lucide-react';
import { useAdminApi } from '@/hooks/useAdminApi';
import { Skeleton } from '@/components/ui/skeleton';

const AdminDashboard = () => {
  const { getStats } = useAdminApi();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Active Users',
      value: stats?.activeUsers || 0,
      icon: UserCheck,
      color: 'text-expense-green',
      bgColor: 'bg-expense-green/10',
    },
    {
      title: 'Logins Today',
      value: stats?.loginsToday || 0,
      icon: LogIn,
      color: 'text-expense-blue',
      bgColor: 'bg-expense-blue/10',
    },
    {
      title: 'System Status',
      value: 'Online',
      icon: Activity,
      color: 'text-expense-green',
      bgColor: 'bg-expense-green/10',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <p className="text-muted-foreground">Overview of your expense management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover-lift">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-3xl font-bold">{stat.value}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Use the sidebar navigation to manage users, view login history, and generate reports.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Application</span>
              <span className="font-medium">BSH EXPENSES</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-expense-green">Operational</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;