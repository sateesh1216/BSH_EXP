import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Settings,
  Database,
  Users,
  Shield,
  Clock,
  Trash2,
  RefreshCw,
  HardDrive,
  UserCheck,
  UserX,
  FileText,
  Activity,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminApi } from '@/hooks/useAdminApi';
import { useToast } from '@/hooks/use-toast';

const AdminSettings = () => {
  const { getSystemInfo, cleanupLoginHistory } = useAdminApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cleanupDays, setCleanupDays] = useState('90');

  const { data: systemInfo, isLoading, refetch } = useQuery({
    queryKey: ['admin-system-info'],
    queryFn: getSystemInfo,
  });

  const cleanupMutation = useMutation({
    mutationFn: (days: number) => cleanupLoginHistory(days),
    onSuccess: (data) => {
      toast({
        title: 'Cleanup Complete',
        description: `Deleted ${data.deletedCount} old login records.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-system-info'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Cleanup Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalRecords =
    (systemInfo?.totalIncomeRecords || 0) +
    (systemInfo?.totalExpenseRecords || 0) +
    (systemInfo?.totalSavingsRecords || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Settings</h2>
            <p className="text-muted-foreground">System configuration & information</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="hover-lift border-border/40 bg-card/50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover-lift">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{systemInfo?.totalUsers || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl" style={{ background: 'hsl(var(--success) / 0.1)' }}>
                    <UserCheck className="h-5 w-5" style={{ color: 'hsl(var(--success))' }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{systemInfo?.activeUsers || 0}</p>
                    <p className="text-xs text-muted-foreground">Active Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-destructive/10">
                    <UserX className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{systemInfo?.inactiveUsers || 0}</p>
                    <p className="text-xs text-muted-foreground">Inactive Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-accent">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{systemInfo?.adminUsers || 0}</p>
                    <p className="text-xs text-muted-foreground">Admin Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Database Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-5 w-5 text-primary" />
                  Database Overview
                </CardTitle>
                <CardDescription>Record counts across all tables</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Income Records</span>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {systemInfo?.totalIncomeRecords || 0}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Expense Records</span>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {systemInfo?.totalExpenseRecords || 0}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Savings Records</span>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {systemInfo?.totalSavingsRecords || 0}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Total Financial Records</span>
                    </div>
                    <Badge className="font-mono bg-primary/10 text-primary border-primary/20">
                      {totalRecords}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Login History Records</span>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {systemInfo?.totalLoginRecords || 0}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Pending Access Requests</span>
                    </div>
                    <Badge
                      variant={systemInfo?.pendingAccessRequests > 0 ? 'destructive' : 'secondary'}
                      className="font-mono"
                    >
                      {systemInfo?.pendingAccessRequests || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Login Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-primary" />
                  Login Activity
                </CardTitle>
                <CardDescription>Login history range and cleanup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Oldest Login</span>
                    <span className="text-sm font-medium">{formatDate(systemInfo?.oldestLoginDate)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Latest Login</span>
                    <span className="text-sm font-medium">{formatDate(systemInfo?.newestLoginDate)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Records</span>
                    <span className="text-sm font-medium">{systemInfo?.totalLoginRecords || 0}</span>
                  </div>
                </div>

                {/* Cleanup Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Cleanup Login History
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Remove old login history records to keep the database clean. Select how many days of history to keep.
                  </p>
                  <div className="flex items-center gap-3">
                    <Select value={cleanupDays} onValueChange={setCleanupDays}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">Keep last 30 days</SelectItem>
                        <SelectItem value="60">Keep last 60 days</SelectItem>
                        <SelectItem value="90">Keep last 90 days</SelectItem>
                        <SelectItem value="180">Keep last 180 days</SelectItem>
                        <SelectItem value="365">Keep last 1 year</SelectItem>
                      </SelectContent>
                    </Select>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={cleanupMutation.isPending}
                        >
                          {cleanupMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          Cleanup
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Confirm Cleanup
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all login history records older than{' '}
                            <strong>{cleanupDays} days</strong>. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => cleanupMutation.mutate(parseInt(cleanupDays))}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Old Records
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="h-5 w-5 text-primary" />
                System Information
              </CardTitle>
              <CardDescription>Application details and version</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Application</p>
                  <p className="font-semibold">BSH Accounts</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Platform</p>
                  <p className="font-semibold">Lovable Cloud</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Framework</p>
                  <p className="font-semibold">React + TypeScript</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">UI Library</p>
                  <p className="font-semibold">Tailwind CSS + shadcn/ui</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Data Visualization</p>
                  <p className="font-semibold">Recharts</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Authentication</p>
                  <p className="font-semibold">Role-Based (Admin/User)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminSettings;
