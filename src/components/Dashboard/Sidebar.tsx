import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, PiggyBank, BarChart3, Calendar } from 'lucide-react';
import { format } from 'date-fns';

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
  const sections = [
    { id: 'income', label: 'Income', icon: TrendingUp, color: 'text-expense-green' },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown, color: 'text-expense-red' },
    { id: 'savings', label: 'Savings', icon: PiggyBank, color: 'text-expense-blue' },
    { id: 'reports', label: 'Reports', icon: BarChart3, color: 'text-primary' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
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
    <div className="w-80 bg-card border-r border-border h-full p-6 space-y-6">
      {/* Filter Section */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Filter Data</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Year</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Month</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
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
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Sections</h3>
        <div className="space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Button
                key={section.id}
                variant={activeSection === section.id ? "default" : "ghost"}
                className="w-full justify-start gap-3 h-12"
                onClick={() => setActiveSection(section.id)}
              >
                <Icon className={`h-5 w-5 ${section.color}`} />
                <span className="font-medium">{section.label}</span>
              </Button>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default Sidebar;