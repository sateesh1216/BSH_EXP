import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, UserCheck, LogIn, Activity, UserX, ChevronRight, Clock, Monitor, Smartphone, Globe } from 'lucide-react';
import { useAdminApi } from '@/hooks/useAdminApi';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow, isToday } from 'date-fns';
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

interface LoginRecord {
  id: string;
  user_id: string;
  login_at: string;
  ip_address: string | null;
  user_agent: string | null;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
}

type FilterType = 'all' | 'active' | 'inactive' | null;

const AdminDashboard = () => {
  const { getStats, getUsers, getLoginHistory } = useAdminApi();
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);
  const [showLoginsToday, setShowLoginsToday] = useState(false);

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

  const { data: loginData, isLoading: loginsLoading } = useQuery({
    queryKey: ['admin-login-history'],
    queryFn: () => getLoginHistory(undefined, 500),
    enabled: showLoginsToday,
  });

  const users: UserProfile[] = usersData?.users || [];
  const allLogins: LoginRecord[] = loginData?.history || [];
  
  // Filter logins for today only
  const todayLogins = allLogins.filter((login) => isToday(new Date(login.login_at)));

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

  const getInitials = (name: string | null, email: string | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.[0]?.toUpperCase() || 'U';
  };

  const getDeviceInfo = (userAgent: string | null) => {
    if (!userAgent) return { type: 'unknown', browser: 'Unknown', os: 'Unknown' };
    
    const ua = userAgent.toLowerCase();
    const isMobile = /mobile|android|iphone|ipad|tablet/i.test(ua);
    
    let browser = 'Unknown';
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
    
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
    
    return { type: isMobile ? 'mobile' : 'desktop', browser, os };
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
      isLoginCard: false,
    },
    {
      title: 'Active Users',
      value: stats?.activeUsers || 0,
      icon: UserCheck,
      color: 'text-expense-green',
      bgColor: 'bg-expense-green/10',
      clickable: true,
      filter: 'active' as FilterType,
      isLoginCard: false,
    },
    {
      title: 'Inactive Users',
      value: (stats?.totalUsers || 0) - (stats?.activeUsers || 0),
      icon: UserX,
      color: 'text-expense-red',
      bgColor: 'bg-expense-red/10',
      clickable: true,
      filter: 'inactive' as FilterType,
      isLoginCard: false,
    },
    {
      title: 'Logins Today',
      value: stats?.loginsToday || 0,
      icon: LogIn,
      color: 'text-expense-blue',
      bgColor: 'bg-expense-blue/10',
      clickable: true,
      filter: null,
      isLoginCard: true,
    },
    {
      title: 'System Status',
      value: 'Online',
      icon: Activity,
      color: 'text-expense-green',
      bgColor: 'bg-expense-green/10',
      clickable: false,
      filter: null,
      isLoginCard: false,
    },
  ];

  const handleCardClick = (stat: typeof statCards[0]) => {
    if (!stat.clickable) return;
    if (stat.isLoginCard) {
      setShowLoginsToday(true);
    } else {
      setActiveFilter(stat.filter);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">Admin Dashboard</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Overview of your expense management system</p>
      </div>

      {error && (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            Failed to load admin stats: {(error as Error).message}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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
              onClick={() => handleCardClick(stat)}
            >
              <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 pb-1 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-1.5 sm:p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                <div className="flex items-center justify-between">
                  {statsLoading ? (
                    <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" />
                  ) : (
                    <p className="text-xl sm:text-3xl font-bold">{stat.value}</p>
                  )}
                  {stat.clickable && (
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
            <p className="text-muted-foreground text-xs sm:text-sm">
              Use the sidebar navigation to manage users, view login history, and generate reports.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">System Information</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-2 text-xs sm:text-sm">
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

      {/* Today's Logins Dialog */}
      <Dialog open={showLoginsToday} onOpenChange={setShowLoginsToday}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-expense-blue" />
              Today's Logins
              <Badge variant="secondary" className="ml-2">
                {todayLogins.length} logins
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            {loginsLoading ? (
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
            ) : todayLogins.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <LogIn className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No logins today</p>
                <p className="text-sm">Check back later for login activity</p>
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {todayLogins.map((login) => {
                  const deviceInfo = getDeviceInfo(login.user_agent);
                  const loginTime = new Date(login.login_at);
                  
                  return (
                    <div
                      key={login.id}
                      className="flex items-center gap-4 p-3 rounded-xl border bg-gradient-to-r from-background to-muted/30 hover:shadow-md transition-all duration-200"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-expense-blue/20">
                        <AvatarFallback className="bg-expense-blue/10 text-expense-blue font-semibold text-sm">
                          {getInitials(login.profiles?.full_name, login.profiles?.email)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {login.profiles?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {login.profiles?.email || 'No email'}
                        </p>
                      </div>

                      <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                        {deviceInfo.type === 'mobile' ? (
                          <Smartphone className="h-4 w-4" />
                        ) : (
                          <Monitor className="h-4 w-4" />
                        )}
                        <span>{deviceInfo.browser}</span>
                      </div>

                      <div className="hidden lg:flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <code className="px-2 py-1 rounded bg-muted text-xs font-mono">
                          {login.ip_address || 'N/A'}
                        </code>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(loginTime, 'HH:mm')}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(loginTime, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
