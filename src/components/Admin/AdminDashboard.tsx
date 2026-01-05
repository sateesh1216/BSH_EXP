import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, UserCheck, LogIn, Activity, UserX, ChevronRight } from 'lucide-react';
import { useAdminApi } from '@/hooks/useAdminApi';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  role: string;
  last_login: string | null;
  login_count: number;
}

type FilterType = 'all' | 'active' | 'inactive' | null;

const AdminDashboard = () => {
  const { getStats, getUsers } = useAdminApi();
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);

  const { data: stats, isLoading: statsLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getStats,
    refetchInterval: 30000,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getUsers,
    enabled: activeFilter !== null,
  });

  const users: UserProfile[] = usersData?.users || [];

  const filteredUsers = users.filter((user) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return user.is_active;
    if (activeFilter === 'inactive') return !user.is_active;
    return true;
  });

  const getDialogTitle = () => {
    switch (activeFilter) {
      case 'all': return 'All Users';
      case 'active': return 'Active Users';
      case 'inactive': return 'Inactive Users';
      default: return 'Users';
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.[0]?.toUpperCase() || 'U';
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      clickable: true,
      filter: 'all' as FilterType,
    },
    {
      title: 'Active Users',
      value: stats?.activeUsers || 0,
      icon: UserCheck,
      color: 'text-expense-green',
      bgColor: 'bg-expense-green/10',
      clickable: true,
      filter: 'active' as FilterType,
    },
    {
      title: 'Inactive Users',
      value: (stats?.totalUsers || 0) - (stats?.activeUsers || 0),
      icon: UserX,
      color: 'text-expense-red',
      bgColor: 'bg-expense-red/10',
      clickable: true,
      filter: 'inactive' as FilterType,
    },
    {
      title: 'Logins Today',
      value: stats?.loginsToday || 0,
      icon: LogIn,
      color: 'text-expense-blue',
      bgColor: 'bg-expense-blue/10',
      clickable: false,
      filter: null,
    },
    {
      title: 'System Status',
      value: 'Online',
      icon: Activity,
      color: 'text-expense-green',
      bgColor: 'bg-expense-green/10',
      clickable: false,
      filter: null,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <p className="text-muted-foreground">Overview of your expense management system</p>
      </div>

      {error && (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            Failed to load admin stats: {(error as Error).message}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className={`hover-lift transition-all duration-200 ${
                stat.clickable 
                  ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 hover:shadow-lg group' 
                  : ''
              }`}
              onClick={() => stat.clickable && setActiveFilter(stat.filter)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-3xl font-bold">{stat.value}</p>
                  )}
                  {stat.clickable && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
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

      {/* Users List Dialog */}
      <Dialog open={activeFilter !== null} onOpenChange={(open) => !open && setActiveFilter(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeFilter === 'active' && <UserCheck className="h-5 w-5 text-expense-green" />}
              {activeFilter === 'inactive' && <UserX className="h-5 w-5 text-expense-red" />}
              {activeFilter === 'all' && <Users className="h-5 w-5 text-primary" />}
              {getDialogTitle()}
              <Badge variant="secondary" className="ml-2">
                {filteredUsers.length} users
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            {usersLoading ? (
              <div className="space-y-3 p-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No users found</p>
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 p-3 rounded-xl border bg-gradient-to-r from-background to-muted/30 hover:shadow-md transition-all duration-200"
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">
                          {user.full_name || 'Unnamed User'}
                        </p>
                        <Badge variant={user.role === 'admin' ? 'default' : 'outline'} className="text-xs shrink-0">
                          {user.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <Badge variant={user.is_active ? 'default' : 'destructive'} className="mb-1">
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {user.last_login 
                          ? formatDistanceToNow(new Date(user.last_login), { addSuffix: true })
                          : 'Never logged in'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
