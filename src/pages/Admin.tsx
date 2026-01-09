import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, TrendingUp, Shield, Menu } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import AdminSidebar from '@/components/Admin/AdminSidebar';
import AdminDashboard from '@/components/Admin/AdminDashboard';
import UserManagement from '@/components/Admin/UserManagement';
import LoginHistory from '@/components/Admin/LoginHistory';
import AdminReports from '@/components/Admin/AdminReports';
import AdminSettings from '@/components/Admin/AdminSettings';
import AccessRequests from '@/components/Admin/AccessRequests';

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
      case 'access-requests':
        return <AccessRequests />;
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

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-transparent">
      {/* Professional Header */}
      <header className="glass-effect border-b border-border/50 sticky top-0 z-50 backdrop-blur-md">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3 animate-fade-in">
              {/* Mobile Menu Button */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  <AdminSidebar 
                    activeSection={activeSection} 
                    setActiveSection={(section) => {
                      setActiveSection(section);
                      setSidebarOpen(false);
                    }} 
                  />
                </SheetContent>
              </Sheet>
              
              <div className="p-1.5 sm:p-2 bg-gradient-primary rounded-lg sm:rounded-xl shadow-glow">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gradient">BSH Accounts</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Admin Panel
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 animate-fade-in [animation-delay:0.2s]">
              <Link to="/">
                <Button variant="outline" size="sm" className="hover-lift border-border/40 bg-card/50">
                  <span className="hidden sm:inline">User Dashboard</span>
                  <span className="sm:hidden">Dashboard</span>
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={signOut} 
                size="sm"
                className="hover-lift border-border/40 bg-card/50"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex">
        {/* Sidebar - Hidden on mobile */}
        <div className="hidden lg:block">
          <AdminSidebar 
            activeSection={activeSection} 
            setActiveSection={setActiveSection} 
          />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;