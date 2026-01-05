import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAdminApi } from '@/hooks/useAdminApi';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  History, 
  Search, 
  Monitor, 
  Smartphone, 
  Globe, 
  Clock, 
  User,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';

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

const ITEMS_PER_PAGE = 10;

const LoginHistory = () => {
  const { getLoginHistory } = useAdminApi();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-login-history'],
    queryFn: () => getLoginHistory(undefined, 500),
  });

  const history: LoginRecord[] = data?.history || [];

  // Filter history based on search
  const filteredHistory = history.filter((record) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      record.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      record.profiles?.email?.toLowerCase().includes(searchLower) ||
      record.ip_address?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Get device info from user agent
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

  const getInitials = (name: string | null, email: string | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg">
            <History className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Login History</h2>
            <p className="text-muted-foreground">Track and monitor user login activity</p>
          </div>
        </div>
        <Badge variant="secondary" className="px-3 py-1.5">
          <Calendar className="h-3.5 w-3.5 mr-1.5" />
          {filteredHistory.length} records
        </Badge>
      </div>

      {/* Search Bar */}
      <Card className="card-professional">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user name, email, or IP address..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 input-professional"
            />
          </div>
        </CardContent>
      </Card>

      {/* Login Records */}
      <Card className="card-professional">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Recent Login Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load login history: {(error as Error).message}
            </div>
          ) : paginatedHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No login records found</p>
              <p className="text-sm">Try adjusting your search criteria</p>
            </div>
          ) : (
            <>
              {paginatedHistory.map((record) => {
                const deviceInfo = getDeviceInfo(record.user_agent);
                const loginTime = new Date(record.login_at);
                
                return (
                  <div
                    key={record.id}
                    className="flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r from-background to-muted/30 hover:shadow-md transition-all duration-200 group"
                  >
                    {/* User Avatar */}
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(record.profiles?.full_name, record.profiles?.email)}
                      </AvatarFallback>
                    </Avatar>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">
                          {record.profiles?.full_name || 'Unknown User'}
                        </p>
                        <Badge variant="outline" className="text-xs shrink-0">
                          <User className="h-3 w-3 mr-1" />
                          User
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {record.profiles?.email || 'No email'}
                      </p>
                    </div>

                    {/* Device Info */}
                    <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                      {deviceInfo.type === 'mobile' ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <Monitor className="h-4 w-4" />
                      )}
                      <span>{deviceInfo.browser}</span>
                      <span className="text-border">•</span>
                      <span>{deviceInfo.os}</span>
                    </div>

                    {/* IP Address */}
                    <div className="hidden lg:flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <code className="px-2 py-1 rounded bg-muted text-xs font-mono">
                        {record.ip_address || 'N/A'}
                      </code>
                    </div>

                    {/* Time */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">
                        {format(loginTime, 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(loginTime, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredHistory.length)} of{' '}
                    {filteredHistory.length} records
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginHistory;
