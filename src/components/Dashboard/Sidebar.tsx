import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, PiggyBank, BarChart3, Calendar, Download, Upload, Shield, Key, Trash2 } from 'lucide-react';
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
    { id: 'income', label: 'Income', icon: TrendingUp, color: 'text-expense-green' },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown, color: 'text-expense-red' },
    { id: 'savings', label: 'Savings', icon: PiggyBank, color: 'text-expense-blue' },
    { id: 'reports', label: 'Reports', icon: BarChart3, color: 'text-primary' },
    { id: 'download', label: 'Download Data', icon: Download, color: 'text-primary' },
    { id: 'upload', label: 'Upload Data', icon: Upload, color: 'text-primary' },
    { id: 'delete', label: 'Delete Data', icon: Trash2, color: 'text-destructive' },
  ];

  const currentYear = new Date().getFullYear();
  // Include years from 2 years in future to 5 years in past to handle all data scenarios
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
    <div className="w-80 bg-card border-r border-border h-full lg:h-[calc(100vh-73px)] p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
      {/* Filter Section */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base">Filter Data</h3>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Year</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9 sm:h-10">
                <SelectValue placeholder="Select year" />
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
          </div>
          
          <div>
            <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Month</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 sm:h-10">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Navigation Section */}
      <Card className="p-3 sm:p-4">
        <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Sections</h3>
        <div className="space-y-1 sm:space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Button
                key={section.id}
                variant={activeSection === section.id ? "default" : "ghost"}
                className="w-full justify-start gap-2 sm:gap-3 h-10 sm:h-12"
                onClick={() => setActiveSection(section.id)}
              >
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${section.color}`} />
                <span className="font-medium text-sm sm:text-base">{section.label}</span>
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Admin Panel - Only visible for admins */}
      {isAdmin && (
        <Card className="p-3 sm:p-4">
          <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Administration</h3>
          <Link to="/admin">
            <Button variant="default" className="w-full justify-start gap-2 sm:gap-3 h-10 sm:h-12">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-medium text-sm sm:text-base">Admin Panel</span>
            </Button>
          </Link>
        </Card>
      )}

      {/* Profile Section */}
      <Card className="p-3 sm:p-4">
        <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Account</h3>
        <div className="space-y-1 sm:space-y-2">
          <Link to="/change-password">
            <Button variant="ghost" className="w-full justify-start gap-2 sm:gap-3 h-10 sm:h-12">
              <Key className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              <span className="font-medium text-sm sm:text-base">Change Password</span>
            </Button>
          </Link>
        </div>
        {/* Admin Status Debug */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border text-[10px] sm:text-xs text-muted-foreground space-y-0.5 sm:space-y-1">
          <p className="truncate">Email: {user?.email || 'Not signed in'}</p>
          <p>DB Role: <span className={dbRole === 'admin' ? 'text-expense-green font-medium' : 'text-expense-red font-medium'}>{dbRole || 'checking...'}</span></p>
          <p>
            Admin status:{" "}
            <span className={isAdmin ? 'text-expense-green font-medium' : 'text-expense-red font-medium'}>
              {isAdmin ? 'Yes' : 'No'}
            </span>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Sidebar;