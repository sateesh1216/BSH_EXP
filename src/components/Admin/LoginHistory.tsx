import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminApi } from '@/hooks/useAdminApi';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { History } from 'lucide-react';

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

const LoginHistory = () => {
  const { getLoginHistory } = useAdminApi();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-login-history'],
    queryFn: () => getLoginHistory(undefined, 100),
  });

  const history: LoginRecord[] = data?.history || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <History className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Login History</h2>
          <p className="text-muted-foreground">Track user login activity</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Logins</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Login Time</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Browser/Device</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{record.profiles?.full_name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">{record.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.login_at), 'MMM d, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>{record.ip_address || 'N/A'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {record.user_agent || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No login history found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginHistory;