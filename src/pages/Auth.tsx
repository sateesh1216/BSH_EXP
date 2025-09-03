import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { TrendingUp, Mail, Lock, ArrowRight, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeInput, validateTextInput } from '@/lib/security';

const Auth = () => {
  const { user, signIn, signUp, failedAttempts, isBlocked } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { toast } = useToast();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Client-side validation
    const sanitizedEmail = sanitizeInput(email);
    const emailValidation = validateTextInput(sanitizedEmail, 'Email', 1, 254);
    if (!emailValidation.isValid) {
      toast({
        title: 'Invalid email',
        description: emailValidation.error,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    
    const { error } = await signIn(sanitizedEmail, password);
    
    if (error) {
      toast({
        title: 'Error signing in',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.',
      });
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Client-side validation
    const sanitizedEmail = sanitizeInput(email);
    const emailValidation = validateTextInput(sanitizedEmail, 'Email', 1, 254);
    if (!emailValidation.isValid) {
      toast({
        title: 'Invalid email',
        description: emailValidation.error,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    
    const { error } = await signUp(sanitizedEmail, password);
    
    if (error) {
      toast({
        title: 'Error signing up',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      });
    }
    
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    
    // Client-side validation
    const sanitizedEmail = sanitizeInput(email);
    const emailValidation = validateTextInput(sanitizedEmail, 'Email', 1, 254);
    if (!emailValidation.isValid) {
      toast({
        title: 'Invalid email',
        description: emailValidation.error,
        variant: 'destructive',
      });
      setResetLoading(false);
      return;
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
      redirectTo: `${window.location.origin}/`,
    });
    
    if (error) {
      toast({
        title: 'Error sending reset email',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Password reset email sent!',
        description: 'Check your email for the password reset link.',
      });
      setShowForgotPassword(false);
    }
    
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-success/5" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-gradient-primary rounded-2xl shadow-glow animate-pulse-glow">
              <TrendingUp className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-gradient">BSH EXPENSES</h1>
          </div>
          <p className="text-muted-foreground text-lg">Manage your income, expenses, and savings efficiently</p>
        </div>

        {/* Main Card */}
        <Card className="bg-gradient-card border-border/50 shadow-xl backdrop-blur-sm animate-slide-up">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-semibold">
              {showForgotPassword ? 'Reset Password' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-base">
              {showForgotPassword 
                ? 'Enter your email to receive a password reset link' 
                : 'Sign in to your account or create a new one'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-0">
            {/* Security Status */}
            {(failedAttempts > 0 || isBlocked) && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-destructive mb-1">Security Notice</h4>
                  <p className="text-sm text-destructive/80">
                    {isBlocked 
                      ? 'Account temporarily locked due to multiple failed attempts. Please try again in 15 minutes.'
                      : `${failedAttempts} failed sign-in attempt${failedAttempts > 1 ? 's' : ''}. Account will be locked after 5 attempts.`
                    }
                  </p>
                </div>
              </div>
            )}
            
            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-primary mb-1">Security Features Active</h4>
                <p className="text-sm text-primary/80">
                  • Input validation and sanitization<br />
                  • Rate limiting protection<br />
                  • Secure authentication with Supabase<br />
                  • Row-level security policies
                </p>
              </div>
            </div>
            
            {showForgotPassword ? (
              /* Forgot Password Form */
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-sm font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 input-professional"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    type="submit" 
                    className="w-full btn-professional" 
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Back to Sign In
                  </Button>
                </div>
              </form>
            ) : (
              /* Sign In/Sign Up Forms */
              <Tabs defaultValue="signin" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                  <TabsTrigger value="signin" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Sign Up
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin" className="space-y-4">
                  <form onSubmit={handleSignIn} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-sm font-medium">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="Enter your email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 input-professional"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 input-professional"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Button 
                        type="submit" 
                        className="w-full btn-professional" 
                        disabled={loading}
                      >
                        {loading ? 'Signing in...' : 'Sign In'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-sm hover:text-primary"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot your password?
                      </Button>
                    </div>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignUp} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-sm font-medium">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="Enter your email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 input-professional"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="Create a strong password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                      {loading ? 'Creating account...' : 'Create Account'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-8 animate-fade-in">
          <p className="text-sm text-muted-foreground">
            Secure financial management for professionals
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;