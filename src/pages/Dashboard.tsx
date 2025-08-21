import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Car, Wrench, Upload, BarChart3, Settings } from 'lucide-react';
import StatsCards from '@/components/Dashboard/StatsCards';
import AddTripForm from '@/components/Dashboard/AddTripForm';
import { Navigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('trips');

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <Car className="h-6 w-6 text-taxi-green" />
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome back, Admin User! Manage your taxi service operations.
              </span>
              <Button variant="outline" onClick={signOut} size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <StatsCards />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="trips" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Trips
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trips" className="space-y-6">
            <AddTripForm />
            
            {/* All Trips Table */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">All Trips</h3>
              <div className="text-center text-muted-foreground py-8">
                No trips added yet. Add your first trip above.
              </div>
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Add Car Maintenance</h3>
              <p className="text-muted-foreground">Maintenance form will be implemented here.</p>
            </div>
            
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Maintenance Records</h3>
              <div className="text-center text-muted-foreground py-8">
                No maintenance records added yet.
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Upload Trips Excel</h3>
                <p className="text-muted-foreground mb-4">
                  Upload an Excel file with trip data. Use the template for correct format.
                </p>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full">
                    Choose File
                  </Button>
                  <Button variant="outline" className="w-full">
                    Download Template
                  </Button>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Upload Maintenance Excel</h3>
                <p className="text-muted-foreground mb-4">
                  Upload an Excel file with maintenance data. Use the template for correct format.
                </p>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full">
                    Choose File
                  </Button>
                  <Button variant="outline" className="w-full">
                    Download Template
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Monthly Reports</h3>
              <p className="text-muted-foreground">Reports and analytics will be implemented here.</p>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Settings</h3>
              <p className="text-muted-foreground">Application settings will be implemented here.</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;