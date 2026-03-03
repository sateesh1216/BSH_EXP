import { TrendingUp, TrendingDown, PiggyBank, BarChart3, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Download, Upload, Trash2, Shield, User, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface BottomNavProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const primaryItems = [
  { id: 'income', label: 'Income', icon: TrendingUp },
  { id: 'expenses', label: 'Expenses', icon: TrendingDown },
  { id: 'savings', label: 'Savings', icon: PiggyBank },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

const moreItems = [
  { id: 'download', label: 'Download Data', icon: Download },
  { id: 'upload', label: 'Upload Data', icon: Upload },
  { id: 'delete', label: 'Delete Data', icon: Trash2 },
];

const BottomNav = ({ activeSection, setActiveSection }: BottomNavProps) => {
  const { isAdmin } = useAuth();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1.5">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-0 flex-1',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', isActive && 'scale-110')} />
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </button>
          );
        })}

        {/* More menu */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-0 flex-1',
                ['download', 'upload', 'delete'].includes(activeSection)
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MoreHorizontal className="h-5 w-5 shrink-0" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8">
            <div className="space-y-2 pt-2">
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground">More Options</h3>
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={activeSection === item.id ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => setActiveSection(item.id)}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                );
              })}
              <div className="border-t border-border pt-2 mt-2 space-y-2">
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" className="w-full justify-start gap-3 h-12">
                      <Shield className="h-5 w-5" />
                      Admin Panel
                    </Button>
                  </Link>
                )}
                <Link to="/profile">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-12">
                    <User className="h-5 w-5" />
                    Profile Settings
                  </Button>
                </Link>
                <Link to="/change-password">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-12">
                    <Key className="h-5 w-5" />
                    Change Password
                  </Button>
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default BottomNav;
