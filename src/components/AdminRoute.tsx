import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard that only allows authenticated admin users.
 * - Unauthenticated users → /auth
 * - Authenticated non-admins → / (user dashboard)
 *
 * Note: This is a UI guard for UX only. Real authorization is enforced
 * server-side by Supabase RLS policies using private.has_role(auth.uid(), 'admin').
 */
const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
