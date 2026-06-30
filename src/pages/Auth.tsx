import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { TrendingUp, Mail, Lock, ArrowRight, Shield, AlertTriangle, Phone, User, CheckCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeInput, validateTextInput } from '@/lib/security';
import SeoHead from '@/components/SeoHead';

const Auth = () => {
  const { user, signIn, failedAttempts, isBlocked } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const { toast } = useToast();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const sanitizedEmail = sanitizeInput(email);
    const emailValidation = validateTextInput(sanitizedEmail, 'Email', 1, 254);
    if (!emailValidation.isValid) {
      toast({ title: 'Invalid email', description: emailValidation.error, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const { error } = await signIn(sanitizedEmail, password);
    if (error) {
      toast({ title: 'Error signing in', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Welcome back!', description: 'You have been signed in successfully.' });
    }
    setLoading(false);
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPhone = sanitizeInput(phone);
    const sanitizedName = sanitizeInput(fullName);
    const emailValidation = validateTextInput(sanitizedEmail, 'Email', 1, 254);
    if (!emailValidation.isValid) {
      toast({ title: 'Invalid email', description: emailValidation.error, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const phoneValidation = validateTextInput(sanitizedPhone, 'Phone number', 10, 15);
    if (!phoneValidation.isValid) {
      toast({ title: 'Invalid phone number', description: phoneValidation.error, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const { error } = await supabase.from('access_requests').insert({
      email: sanitizedEmail,
      phone_number: sanitizedPhone,
      full_name: sanitizedName || null,
    });
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Request already exists', description: 'An access request with this email already exists. Please wait for admin approval.', variant: 'destructive' });
      } else {
        toast({ title: 'Error submitting request', description: error.message, variant: 'destructive' });
      }
    } else {
      setRequestSubmitted(true);
      toast({ title: 'Request submitted!', description: 'Your access request has been submitted. An admin will review and contact you with login credentials.' });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    const sanitizedEmail = sanitizeInput(email);
    const emailValidation = validateTextInput(sanitizedEmail, 'Email', 1, 254);
    if (!emailValidation.isValid) {
      toast({ title: 'Invalid email', description: emailValidation.error, variant: 'destructive' });
      setResetLoading(false);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
      redirectTo: `${window.location.origin}/`,
    });
    if (error) {
      toast({ title: 'Error sending reset email', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password reset email sent!', description: 'Check your email for the password reset link.' });
      setShowForgotPassword(false);
    }
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-primary/5" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/8 blur-3xl translate-y-1/3 -translate-x-1/4" />
      
      {/* Floating decorative elements */}
      <div className="absolute top-20 left-10 w-2 h-2 rounded-full bg-primary/30 animate-pulse" />
      <div className="absolute top-40 right-20 w-3 h-3 rounded-full bg-primary/20 animate-pulse [animation-delay:1s]" />
      <div className="absolute bottom-32 left-1/4 w-2 h-2 rounded-full bg-primary/25 animate-pulse [animation-delay:2s]" />
      
      <div className="w-full max-w-[420px] relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="relative">
              <div className="p-3.5 bg-gradient-primary rounded-2xl shadow-glow">
                <TrendingUp className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 p-1 bg-background rounded-full shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">BSH Accounts</h1>
          <p className="text-muted-foreground text-sm">Manage your finances with confidence</p>
        </div>

        {/* Main Card */}
        <Card className="border-border/40 shadow-xl backdrop-blur-md bg-card/95 animate-slide-up">
          <CardHeader className="text-center pb-2 pt-6">
            <CardTitle className="text-xl font-semibold">
              {showForgotPassword ? 'Reset Password' : requestSubmitted ? 'Request Submitted' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-sm">
              {showForgotPassword 
                ? 'Enter your email to receive a reset link' 
                : requestSubmitted
                ? 'Your request is pending admin approval'
                : 'Sign in or request access to get started'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-2 pb-6 px-6">
            {/* Security Status */}
            {(failedAttempts > 0 || isBlocked) && (
              <div className="mb-5 p-3.5 bg-destructive/8 border border-destructive/15 rounded-xl flex items-start gap-3">
                <AlertTriangle className="h-4.5 w-4.5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-destructive text-sm mb-0.5">Security Notice</h4>
                  <p className="text-xs text-destructive/80">
                    {isBlocked 
                      ? 'Account temporarily locked. Try again in 15 minutes.'
                      : `${failedAttempts} failed attempt${failedAttempts > 1 ? 's' : ''}. Locked after 5.`
                    }
                  </p>
                </div>
              </div>
            )}
            
            {requestSubmitted ? (
              <div className="text-center py-6">
                <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <CheckCircle className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">Request Received!</h3>
                <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
                  An administrator will review your request and send you login credentials.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setRequestSubmitted(false); setEmail(''); setPhone(''); setFullName(''); }}
                >
                  Submit Another Request
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-5 p-3 bg-primary/5 border border-primary/10 rounded-xl flex items-start gap-2.5">
                  <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Admin-controlled registration with secure passwords and row-level security
                  </p>
                </div>
                
                {showForgotPassword ? (
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-sm font-medium">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="reset-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary" required />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <Button type="submit" className="w-full h-11 rounded-xl btn-professional" disabled={resetLoading}>
                        {resetLoading ? 'Sending...' : 'Send Reset Link'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => setShowForgotPassword(false)}>
                        Back to Sign In
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Tabs defaultValue="signin" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2 h-10 rounded-xl bg-muted/60 p-1">
                      <TabsTrigger value="signin" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-sm">
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger value="request" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-sm">
                        Request Access
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="signin" className="space-y-4 mt-4">
                      <form onSubmit={handleSignIn} className="space-y-4">
                        <div className="space-y-3.5">
                          <div className="space-y-1.5">
                            <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input id="signin-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary" required />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input id="signin-password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary" required />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2.5 pt-1">
                          <Button type="submit" className="w-full h-11 rounded-xl btn-professional" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" className="w-full text-xs hover:text-primary" onClick={() => setShowForgotPassword(true)}>
                            Forgot your password?
                          </Button>
                        </div>
                      </form>
                    </TabsContent>
                    
                    <TabsContent value="request" className="space-y-4 mt-4">
                      <form onSubmit={handleRequestAccess} className="space-y-4">
                        <div className="space-y-3.5">
                          <div className="space-y-1.5">
                            <Label htmlFor="request-name" className="text-sm font-medium">Full Name <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input id="request-name" type="text" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="request-email" className="text-sm font-medium">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input id="request-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary" required />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="request-phone" className="text-sm font-medium">Phone Number</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input id="request-phone" type="tel" placeholder="Your phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary" required />
                            </div>
                            <p className="text-[11px] text-muted-foreground pl-1">
                              We'll use this to send your login credentials
                            </p>
                          </div>
                        </div>
                        <Button type="submit" className="w-full h-11 rounded-xl btn-professional" disabled={loading}>
                          {loading ? 'Submitting...' : 'Request Access'}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                )}
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-6 animate-fade-in">
          <p className="text-xs text-muted-foreground/70">
            Secure financial management • BSH Accounts
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
