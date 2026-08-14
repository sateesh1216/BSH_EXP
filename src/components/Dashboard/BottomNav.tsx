import { TrendingUp, TrendingDown, PiggyBank, BarChart3, MoreHorizontal, HandCoins } from 'lucide-react';
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
  { id: 'handloan', label: 'Loan', icon: HandCoins },
];

const moreItems = [
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'download', label: 'Download Data', icon: Download },
  { id: 'upload', label: 'Upload Data', icon: Upload },
  { id: 'delete', label: 'Delete Data', icon: Trash2 },
];

const BottomNav = ({ activeSection, setActiveSection }: BottomNavProps) => {
  const { isAdmin } = useAuth();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-2xl border-t border-border/50 safe-area-bottom shadow-[0_-8px_30px_-12px_hsl(var(--foreground)/0.25)]">
      <div className="flex items-stretch justify-around px-1 pt-1.5 pb-1">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 px-1 py-1.5 rounded-2xl transition-all duration-300 ease-out min-w-0 flex-1 active:scale-90',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center h-8 w-14 rounded-full transition-all duration-300',
                  isActive ? 'bg-primary/15' : 'bg-transparent'
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0 transition-transform duration-300', isActive && 'scale-110')} />
              </span>
              <span className={cn('text-[10px] leading-none truncate transition-all duration-200', isActive ? 'font-semibold' : 'font-medium')}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More menu */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 px-1 py-1.5 rounded-2xl transition-all duration-300 min-w-0 flex-1 active:scale-90',
                ['reports', 'download', 'upload', 'delete'].includes(activeSection)
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center h-8 w-14 rounded-full transition-all duration-300',
                  ['reports', 'download', 'upload', 'delete'].includes(activeSection) ? 'bg-primary/15' : 'bg-transparent'
                )}
              >
                <MoreHorizontal className="h-5 w-5 shrink-0" />
              </span>
              <span className="text-[10px] leading-none font-medium">More</span>
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
