import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const AdminReports = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Reports</h2>
          <p className="text-muted-foreground">System-wide financial reports</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Comprehensive system-wide financial reports will be available here. This includes:
          </p>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• Total income across all users</li>
            <li>• Total expenses across all users</li>
            <li>• Monthly and yearly comparison charts</li>
            <li>• Export functionality for all data</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReports;