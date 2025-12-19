import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { TrendingUp, Lock, ArrowRight, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ChangePassword = () => {
  const { user, loading: authLoading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkMustChangePassword = async () => {
      if (!user) {
        setCheckingProfile(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('user_id', user.id)
        .single();

      setMustChangePassword(profile?.must_change_password || false);
      setCheckingProfile(false);
    };

    checkMustChangePassword();
  }, [user]);

  if (authLoading || checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Clear the must_change_password flag
      await supabase
        .from('profiles')
        .update({ must_change_password: false, temp_password: null })
        .eq('user_id', user.id);

      toast({
        title: 'Password changed successfully',
        description: 'Your password has been updated.',
      });

      // Redirect to dashboard
      window.location.href = '/';
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'Error changing password',
        description: errorMessage,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-success/5" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-gradient-primary rounded-2xl shadow-glow">
              <TrendingUp className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-gradient">BSH EXPENSES</h1>
          </div>
        </div>

        <Card className="bg-gradient-card border-border/50 shadow-xl backdrop-blur-sm animate-slide-up">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-semibold">
              {mustChangePassword ? 'Change Your Password' : 'Update Password'}
            </CardTitle>
            <CardDescription className="text-base">
              {mustChangePassword
                ? 'You must change your temporary password before continuing.'
                : 'Enter your new password below.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {mustChangePassword && (
              <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
                <Shield className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-warning mb-1">Password Change Required</h4>
                  <p className="text-sm text-warning/80">
                    For security reasons, you must change your temporary password.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 input-professional"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 input-professional"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 8 characters long
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full btn-professional"
                disabled={loading}
              >
                {loading ? 'Changing Password...' : 'Change Password'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChangePassword;