import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, PiggyBank, BarChart3, Calendar, Download, Upload, Shield, Key, Trash2, User, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
}

const Sidebar = ({ 
  activeSection, 
  setActiveSection, 
  selectedMonth, 
  setSelectedMonth,
  selectedYear,
  setSelectedYear
}: SidebarProps) => {
  const { isAdmin, user } = useAuth();
  const [dbRole, setDbRole] = useState<string | null>(null);

  useEffect(() => {
    const checkDbRole = async () => {
      if (user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        setDbRole(data?.role || 'none');
      }
    };
    checkDbRole();
  }, [user]);

  const mainSections = [
    { id: 'income', label: 'Income', icon: TrendingUp, color: 'text-success' },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown, color: 'text-expense-red' },
    { id: 'savings', label: 'Savings', icon: PiggyBank, color: 'text-expense-blue' },
    { id: 'reports', label: 'Reports', icon: BarChart3, color: 'text-primary' },
  ];

  const toolSections = [
    { id: 'download', label: 'Download Data', icon: Download },
    { id: 'upload', label: 'Upload Data', icon: Upload },
    { id: 'delete', label: 'Delete Data', icon: Trash2, destructive: true },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear + 2 - i);
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  return (
    <div className="w-72 xl:w-80 bg-card/80 backdrop-blur-sm border-r border-border/50 h-[calc(100vh-65px)] sticky top-[65px] flex flex-col overflow-hidden">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
        
        {/* Date Filters - compact inline */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filter Period</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9 text-sm bg-background/50">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 text-sm bg-background/50">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* Main Navigation */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Navigation</span>
          <div className="space-y-0.5">
            {mainSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary-foreground' : section.color)} />
                  <span className="flex-1 text-left">{section.label}</span>
                  {isActive && <ChevronRight className="h-4 w-4 opacity-70" />}
                </button>
              );
            })}
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* Tools */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Data Tools</span>
          <div className="space-y-0.5">
            {toolSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : section.destructive
                        ? 'text-destructive/70 hover:bg-destructive/10 hover:text-destructive'
                        : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary-foreground')} />
                  <span className="flex-1 text-left">{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Admin Panel */}
        {isAdmin && (
          <>
            <Separator className="opacity-50" />
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Administration</span>
              <Link to="/admin">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-accent hover:text-foreground transition-all">
                  <Shield className="h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1 text-left">Admin Panel</span>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </button>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Fixed bottom: Account section */}
      <div className="border-t border-border/50 p-4 bg-card/90 backdrop-blur-sm space-y-1">
        <Link to="/profile">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground/70 hover:bg-accent hover:text-foreground transition-all">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-left">Profile Settings</span>
          </button>
        </Link>
        <Link to="/change-password">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground/70 hover:bg-accent hover:text-foreground transition-all">
            <Key className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-left">Change Password</span>
          </button>
        </Link>
        <div className="pt-2 px-3 text-[10px] text-muted-foreground/60 truncate">
          {user?.email}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
