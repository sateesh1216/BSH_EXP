import { Button } from '@/components/ui/button';
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
    <div className="w-72 bg-card/80 backdrop-blur-sm border-r border-border/40 h-full lg:h-[calc(100vh-73px)] p-4 sm:p-5 overflow-y-auto">
      <div className="space-y-1.5">
        <h3 className="font-semibold mb-4 text-muted-foreground uppercase text-[11px] tracking-widest px-3">
          Admin Navigation
        </h3>
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <Button
              key={section.id}
              variant="ghost"
              className={`w-full justify-start gap-3 h-11 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
              onClick={() => setActiveSection(section.id)}
            >
              <Icon className={`h-[18px] w-[18px] ${isActive ? '' : 'opacity-70'}`} />
              <span className="font-medium text-sm">{section.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground/80" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default AdminSidebar;
