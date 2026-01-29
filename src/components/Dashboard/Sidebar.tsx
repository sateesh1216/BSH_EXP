import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, PiggyBank, BarChart3, Calendar, Download, Upload, Shield, Key, Trash2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  const sections = [
    { id: 'income', label: 'Income', icon: TrendingUp, color: 'text-success', bgColor: 'bg-success/10' },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown, color: 'text-expense-red', bgColor: 'bg-expense-red/10' },
    { id: 'savings', label: 'Savings', icon: PiggyBank, color: 'text-expense-blue', bgColor: 'bg-expense-blue/10' },
    { id: 'reports', label: 'Reports', icon: BarChart3, color: 'text-primary', bgColor: 'bg-primary/10' },
    { id: 'download', label: 'Download', icon: Download, color: 'text-muted-foreground', bgColor: 'bg-muted' },
    { id: 'upload', label: 'Upload', icon: Upload, color: 'text-muted-foreground', bgColor: 'bg-muted' },
    { id: 'delete', label: 'Delete Data', icon: Trash2, color: 'text-destructive', bgColor: 'bg-destructive/10' },
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
    <div className="w-72 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/40 h-fit max-h-[calc(100vh-120px)] p-4 space-y-4 overflow-y-auto shadow-sm">
      {/* Filter Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">Time Period</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-9 rounded-xl border-border/40 bg-background/50 text-sm">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-9 rounded-xl border-border/40 bg-background/50 text-sm">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label.slice(0, 3)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Navigation Section */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Navigation</span>
        <div className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <Button
                key={section.id}
                variant="ghost"
                className={`w-full justify-start gap-3 h-10 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90' 
                    : 'hover:bg-muted/80'
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-white/20' : section.bgColor}`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : section.color}`} />
                </div>
                <span className="font-medium text-sm">{section.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Admin Panel */}
      {isAdmin && (
        <>
          <div className="border-t border-border/40" />
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Administration</span>
            <Link to="/admin">
              <Button variant="ghost" className="w-full justify-start gap-3 h-10 rounded-xl hover:bg-primary/10">
                <div className="p-1 rounded-lg bg-primary/10">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium text-sm">Admin Panel</span>
                <Sparkles className="h-3 w-3 ml-auto text-primary" />
              </Button>
            </Link>
          </div>
        </>
      )}

      {/* Account Section */}
      <div className="border-t border-border/40" />
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Account</span>
        <Link to="/change-password">
          <Button variant="ghost" className="w-full justify-start gap-3 h-10 rounded-xl hover:bg-muted/80">
            <div className="p-1 rounded-lg bg-muted">
              <Key className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="font-medium text-sm">Change Password</span>
          </Button>
        </Link>
        
        {/* User Info Card */}
        <div className="mt-3 p-3 rounded-xl bg-muted/50 border border-border/40">
          <p className="text-xs text-muted-foreground truncate mb-1.5">{user?.email || 'Not signed in'}</p>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
              dbRole === 'admin' 
                ? 'bg-success/10 text-success' 
                : 'bg-muted text-muted-foreground'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dbRole === 'admin' ? 'bg-success' : 'bg-muted-foreground'}`} />
              {dbRole === 'admin' ? 'Admin' : 'User'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;