import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, TrendingUp, Shield } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import AdminSidebar from '@/components/Admin/AdminSidebar';
import AdminDashboard from '@/components/Admin/AdminDashboard';
import UserManagement from '@/components/Admin/UserManagement';
import LoginHistory from '@/components/Admin/LoginHistory';
import AdminReports from '@/components/Admin/AdminReports';
import AdminSettings from '@/components/Admin/AdminSettings';

const Admin = () => {
  const { user, signOut, isAdmin, loading } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'users':
        return <UserManagement />;
      case 'login-history':
        return <LoginHistory />;
      case 'reports':
        return <AdminReports />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <AdminDashboard />;
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
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Admin Panel
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 animate-fade-in [animation-delay:0.2s]">
              <Link to="/">
                <Button variant="outline" size="sm" className="hover-lift border-border/40 bg-card/50">
                  User Dashboard
                </Button>
              </Link>
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
        <AdminSidebar 
          activeSection={activeSection} 
          setActiveSection={setActiveSection} 
        />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;