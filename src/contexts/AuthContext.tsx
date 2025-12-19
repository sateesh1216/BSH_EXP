import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  failedAttempts: number;
  isBlocked: boolean;
  mustChangePassword: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const checkUserRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      setIsAdmin(data?.role === 'admin');
    } catch {
      setIsAdmin(false);
    }
  };

  const checkMustChangePassword = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('user_id', userId)
        .single();
      setMustChangePassword(data?.must_change_password || false);
    } catch {
      setMustChangePassword(false);
    }
  };

  const recordLoginHistory = async (userId: string) => {
    try {
      await supabase.from('login_history').insert({
        user_id: userId,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Error recording login history:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid deadlock
          setTimeout(() => {
            checkUserRole(session.user.id);
            checkMustChangePassword(session.user.id);
            
            // Record login only on sign in
            if (event === 'SIGNED_IN') {
              recordLoginHistory(session.user.id);
            }
          }, 0);
        } else {
          setIsAdmin(false);
          setMustChangePassword(false);
        }
        
        setLoading(false);
      }
    );

    // Get existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkUserRole(session.user.id);
        checkMustChangePassword(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Input validation helper
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8 && password.length <= 128;
  };

  const sanitizeInput = (input: string): string => {
    return input.trim().toLowerCase();
  };

  const signUp = async (email: string, password: string) => {
    // Input validation and sanitization
    const sanitizedEmail = sanitizeInput(email);
    
    if (!validateEmail(sanitizedEmail)) {
      return { error: { message: 'Please enter a valid email address' } };
    }
    
    if (!validatePassword(password)) {
      return { error: { message: 'Password must be between 8 and 128 characters' } };
    }

    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Check if user is blocked due to too many failed attempts
    if (isBlocked) {
      return { error: { message: 'Too many failed attempts. Please try again later.' } };
    }

    // Input validation and sanitization
    const sanitizedEmail = sanitizeInput(email);
    
    if (!validateEmail(sanitizedEmail)) {
      return { error: { message: 'Please enter a valid email address' } };
    }
    
    if (!validatePassword(password)) {
      return { error: { message: 'Invalid credentials' } }; // Don't reveal password requirements on login
    }

    const { error, data } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password,
    });
    
    // Handle failed attempts
    if (error) {
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      
      // Block after 5 failed attempts
      if (newFailedAttempts >= 5) {
        setIsBlocked(true);
        // Unblock after 15 minutes
        setTimeout(() => {
          setIsBlocked(false);
          setFailedAttempts(0);
        }, 15 * 60 * 1000);
        return { error: { message: 'Too many failed attempts. Please try again in 15 minutes.' } };
      }
      
      return { error: { message: 'Invalid credentials' } }; // Generic error message
    }
    
    // Reset failed attempts on successful login
    setFailedAttempts(0);
    setIsBlocked(false);

    // Check if user account is active
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('user_id', data.user.id)
        .single();

      if (profile && !profile.is_active) {
        await supabase.auth.signOut();
        return { error: { message: 'Your account has been deactivated. Please contact an administrator.' } };
      }
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin,
    failedAttempts,
    isBlocked,
    mustChangePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};