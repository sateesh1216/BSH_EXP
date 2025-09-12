import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, TrendingUp, Search } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import Sidebar from '@/components/Dashboard/Sidebar';
import MonthlySummaryCards from '@/components/Dashboard/MonthlySummaryCards';
import IncomeForm from '@/components/Dashboard/IncomeForm';
import ExpenseForm from '@/components/Dashboard/ExpenseForm';
import SavingsForm from '@/components/Dashboard/SavingsForm';
import EditableDataTable from '@/components/Dashboard/EditableDataTable';
import Reports from '@/components/Dashboard/Reports';
import DownloadData from '@/components/Dashboard/DownloadData';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState('income');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
  const [expenseSearchTerm, setExpenseSearchTerm] = useState('');

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const renderForm = () => {
    switch (activeSection) {
      case 'income':
        return <IncomeForm />;
      case 'expenses':
        return <ExpenseForm />;
      case 'savings':
        return <SavingsForm />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'income':
        return (
          <div className="space-y-6">
            <IncomeForm />
            <EditableDataTable type="income" selectedMonth={selectedMonth} selectedYear={selectedYear} />
          </div>
        );
      case 'expenses':
        return (
          <div className="space-y-6">
            <ExpenseForm />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search expenses (e.g., bike petrol, groceries...)"
                value={expenseSearchTerm}
                onChange={(e) => setExpenseSearchTerm(e.target.value)}
                className="pl-10 max-w-md"
              />
            </div>
            <EditableDataTable 
              type="expenses" 
              selectedMonth={selectedMonth} 
              selectedYear={selectedYear}
              searchTerm={expenseSearchTerm}
            />
          </div>
        );
      case 'savings':
        return (
          <div className="space-y-6">
            <SavingsForm />
            <EditableDataTable type="savings" selectedMonth={selectedMonth} selectedYear={selectedYear} />
          </div>
        );
      case 'reports':
        return <Reports selectedMonth={selectedMonth} selectedYear={selectedYear} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Professional Header */}
      <header className="glass-effect border-b border-border/50 sticky top-0 z-50 backdrop-blur-md">
        <div className="px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">BSH EXPENSES</h1>
                <p className="text-xs text-muted-foreground">Financial Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-4 animate-fade-in [animation-delay:0.2s]">
              <span className="text-sm text-muted-foreground hidden sm:block">
                Welcome back! Track your finances professionally.
              </span>
              <DownloadData selectedMonth={selectedMonth} selectedYear={selectedYear} />
              <Button 
                variant="outline" 
                onClick={signOut} 
                size="sm"
                className="hover-lift border-border/40 bg-card/50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
        />

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Summary Cards */}
            <div className="animate-slide-up">
              <MonthlySummaryCards selectedMonth={selectedMonth} selectedYear={selectedYear} />
            </div>

            {/* Dynamic Content */}
            <div className="animate-slide-up [animation-delay:0.3s]">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;