import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

const AddTripForm = () => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    driverName: '',
    route: '',
    destination: '',
    companyName: '',
    driverAmount: '',
    commission: '',
    fuelType: '',
    paymentMode: '',
    fuelCost: '',
    tolls: '',
    tripAmount: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const calculateProfit = () => {
    const tripAmount = parseFloat(formData.tripAmount) || 0;
    const driverAmount = parseFloat(formData.driverAmount) || 0;
    const commission = parseFloat(formData.commission) || 0;
    const fuelCost = parseFloat(formData.fuelCost) || 0;
    const tolls = parseFloat(formData.tolls) || 0;
    
    return tripAmount - driverAmount - commission - fuelCost - tolls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const calculatedProfit = calculateProfit();
      
      const { error } = await supabase
        .from('trips')
        .insert({
          date: formData.date,
          driver_name: formData.driverName,
          route: formData.route,
          destination: formData.destination,
          company_name: formData.companyName,
          driver_amount: parseFloat(formData.driverAmount) || 0,
          commission: parseFloat(formData.commission) || 0,
          fuel_type: formData.fuelType,
          payment_mode: formData.paymentMode,
          fuel_cost: parseFloat(formData.fuelCost) || 0,
          tolls: parseFloat(formData.tolls) || 0,
          trip_amount: parseFloat(formData.tripAmount) || 0,
          calculated_profit: calculatedProfit
        });

      if (error) throw error;

      toast({
        title: 'Trip added successfully!',
        description: 'The new trip has been recorded.',
      });

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        driverName: '',
        route: '',
        destination: '',
        companyName: '',
        driverAmount: '',
        commission: '',
        fuelType: '',
        paymentMode: '',
        fuelCost: '',
        tolls: '',
        tripAmount: ''
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    } catch (error: any) {
      toast({
        title: 'Error adding trip',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add New Trip
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driverName">Driver Name</Label>
            <Input
              id="driverName"
              placeholder="Enter driver name"
              value={formData.driverName}
              onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="route">Route</Label>
            <Input
              id="route"
              placeholder="Starting location"
              value={formData.route}
              onChange={(e) => setFormData({ ...formData, route: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">To</Label>
            <Input
              id="destination"
              placeholder="Destination"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company</Label>
            <Input
              id="companyName"
              placeholder="Company name"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driverAmount">Driver Amount (₹)</Label>
            <Input
              id="driverAmount"
              type="number"
              step="0.01"
              placeholder="0"
              value={formData.driverAmount}
              onChange={(e) => setFormData({ ...formData, driverAmount: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission">Commission (₹)</Label>
            <Input
              id="commission"
              type="number"
              step="0.01"
              placeholder="0"
              value={formData.commission}
              onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fuelType">Fuel Type</Label>
            <Select value={formData.fuelType} onValueChange={(value) => setFormData({ ...formData, fuelType: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select fuel type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="petrol">Petrol</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="cng">CNG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMode">Payment Mode</Label>
            <Select value={formData.paymentMode} onValueChange={(value) => setFormData({ ...formData, paymentMode: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fuelCost">Fuel Cost (₹)</Label>
            <Input
              id="fuelCost"
              type="number"
              step="0.01"
              placeholder="0"
              value={formData.fuelCost}
              onChange={(e) => setFormData({ ...formData, fuelCost: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tolls">Tolls (₹)</Label>
            <Input
              id="tolls"
              type="number"
              step="0.01"
              placeholder="0"
              value={formData.tolls}
              onChange={(e) => setFormData({ ...formData, tolls: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tripAmount">Trip Amount (₹)</Label>
            <Input
              id="tripAmount"
              type="number"
              step="0.01"
              placeholder="0"
              value={formData.tripAmount}
              onChange={(e) => setFormData({ ...formData, tripAmount: e.target.value })}
              required
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-medium">Calculated Profit:</span>
            <span className="text-xl font-bold text-taxi-green">
              ₹{calculateProfit().toFixed(2)}
            </span>
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Adding Trip...' : 'Add Trip'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddTripForm;