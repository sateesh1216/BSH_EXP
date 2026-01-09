import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LayoutDashboard, Users, History, BarChart3, Settings, UserPlus } from 'lucide-react';

interface AdminSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const AdminSidebar = ({ activeSection, setActiveSection }: AdminSidebarProps) => {
  const sections = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'access-requests', label: 'Access Requests', icon: UserPlus },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'login-history', label: 'Login History', icon: History },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-72 bg-card border-r border-border h-full lg:h-[calc(100vh-73px)] p-4 sm:p-6 overflow-y-auto">
      <Card className="p-3 sm:p-4">
        <h3 className="font-semibold mb-3 sm:mb-4 text-muted-foreground uppercase text-xs tracking-wider">
          Admin Navigation
        </h3>
        <div className="space-y-1 sm:space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Button
                key={section.id}
                variant={activeSection === section.id ? "default" : "ghost"}
                className="w-full justify-start gap-3 h-10 sm:h-11"
                onClick={() => setActiveSection(section.id)}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-medium text-sm sm:text-base">{section.label}</span>
              </Button>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default AdminSidebar;