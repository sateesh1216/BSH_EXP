import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, UserCheck, LogIn, Activity, UserX, ChevronRight, Clock, Monitor, Smartphone, Globe, Zap, Server } from 'lucide-react';
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
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
      gradient: 'from-primary/15 to-primary/5',
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary',
      borderAccent: 'border-l-primary',
      clickable: true,
      filter: 'all' as FilterType,
      isLoginCard: false,
    },
    {
      title: 'Active Users',
      value: stats?.activeUsers || 0,
      icon: UserCheck,
      gradient: 'from-emerald-500/15 to-emerald-500/5',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-500',
      borderAccent: 'border-l-emerald-500',
      clickable: true,
      filter: 'active' as FilterType,
      isLoginCard: false,
    },
    {
      title: 'Inactive Users',
      value: (stats?.totalUsers || 0) - (stats?.activeUsers || 0),
      icon: UserX,
      gradient: 'from-rose-500/15 to-rose-500/5',
      iconBg: 'bg-rose-500/15',
      iconColor: 'text-rose-500',
      borderAccent: 'border-l-rose-500',
      clickable: true,
      filter: 'inactive' as FilterType,
      isLoginCard: false,
    },
    {
      title: 'Logins Today',
      value: stats?.loginsToday || 0,
      icon: LogIn,
      gradient: 'from-blue-500/15 to-blue-500/5',
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-500',
      borderAccent: 'border-l-blue-500',
      clickable: true,
      filter: null,
      isLoginCard: true,
    },
    {
      title: 'System Status',
      value: 'Online',
      icon: Activity,
      gradient: 'from-emerald-500/15 to-emerald-500/5',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-500',
      borderAccent: 'border-l-emerald-500',
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Admin Dashboard</h2>
          <p className="text-sm text-muted-foreground">Overview of your expense management system</p>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            Failed to load admin stats: {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className={`relative overflow-hidden border-l-[3px] ${stat.borderAccent} transition-all duration-300 ${
                stat.clickable 
                  ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 group' 
                  : ''
              }`}
              onClick={() => handleCardClick(stat)}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`} />
              <CardHeader className="relative flex flex-row items-center justify-between p-3 sm:p-4 pb-1 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-1.5 sm:p-2 rounded-xl ${stat.iconBg}`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent className="relative p-3 sm:p-4 pt-0 sm:pt-0">
                <div className="flex items-center justify-between">
                  {statsLoading ? (
                    <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" />
                  ) : (
                    <p className="text-xl sm:text-3xl font-bold">{stat.value}</p>
                  )}
                  {stat.clickable && (
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="border-border/40 hover:shadow-md transition-shadow duration-300">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3 flex flex-row items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
              Use the sidebar navigation to manage users, view login history, and generate reports.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 hover:shadow-md transition-shadow duration-300">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3 flex flex-row items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <CardTitle className="text-base sm:text-lg">System Information</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-2.5 text-xs sm:text-sm">
            {[
              { label: 'Application', value: 'BSH Accounts', color: '' },
              { label: 'Version', value: '1.0.0', color: '' },
              { label: 'Status', value: 'Operational', color: 'text-emerald-500' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={`font-medium ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Users List Dialog */}
      <Dialog open={activeFilter !== null} onOpenChange={(open) => !open && setActiveFilter(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeFilter === 'active' && <UserCheck className="h-5 w-5 text-emerald-500" />}
              {activeFilter === 'inactive' && <UserX className="h-5 w-5 text-rose-500" />}
              {activeFilter === 'all' && <Users className="h-5 w-5 text-primary" />}
              {getDialogTitle()}
              <Badge variant="secondary" className="ml-2">{filteredUsers.length} users</Badge>
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
                  <div key={user.id} className="flex items-center gap-4 p-3 rounded-xl border border-border/40 bg-card hover:bg-muted/30 hover:shadow-sm transition-all duration-200">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/15">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{user.full_name || 'Unnamed User'}</p>
                        <Badge variant={user.role === 'admin' ? 'default' : 'outline'} className="text-xs shrink-0">{user.role}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={user.is_active ? 'default' : 'destructive'} className="mb-1">{user.is_active ? 'Active' : 'Inactive'}</Badge>
                      <p className="text-xs text-muted-foreground">
                        {user.last_login ? formatDistanceToNow(new Date(user.last_login), { addSuffix: true }) : 'Never logged in'}
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
              <LogIn className="h-5 w-5 text-blue-500" />
              Today's Logins
              <Badge variant="secondary" className="ml-2">{todayLogins.length} logins</Badge>
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
                    <div key={login.id} className="flex items-center gap-4 p-3 rounded-xl border border-border/40 bg-card hover:bg-muted/30 hover:shadow-sm transition-all duration-200">
                      <Avatar className="h-10 w-10 ring-2 ring-blue-500/15">
                        <AvatarFallback className="bg-blue-500/10 text-blue-500 font-semibold text-sm">
                          {getInitials(login.profiles?.full_name, login.profiles?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{login.profiles?.full_name || 'Unknown User'}</p>
                        <p className="text-sm text-muted-foreground truncate">{login.profiles?.email || 'No email'}</p>
                      </div>
                      <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                        {deviceInfo.type === 'mobile' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                        <span>{deviceInfo.browser}</span>
                      </div>
                      <div className="hidden lg:flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <code className="px-2 py-1 rounded-lg bg-muted text-xs font-mono">{login.ip_address || 'N/A'}</code>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(loginTime, 'HH:mm')}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(loginTime, { addSuffix: true })}</p>
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
