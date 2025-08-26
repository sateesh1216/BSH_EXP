import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, TrendingUp } from 'lucide-react';
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
            <EditableDataTable type="expenses" selectedMonth={selectedMonth} selectedYear={selectedYear} />
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="px-6">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-expense-green" />
              <h1 className="text-2xl font-bold text-foreground">BSH EXPENSES</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome back! Track your income, expenses, and savings.
              </span>
              <DownloadData selectedMonth={selectedMonth} selectedYear={selectedYear} />
              <Button variant="outline" onClick={signOut} size="sm">
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
        <main className="flex-1 p-6">
          {/* Summary Cards */}
          <div className="mb-6">
            <MonthlySummaryCards selectedMonth={selectedMonth} selectedYear={selectedYear} />
          </div>

          {/* Dynamic Content */}
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;