import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { RoleApp } from '../types/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: RoleApp;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && role !== requiredRole) {
    const redirect = role === 'gestionnaire' ? '/gestionnaire' : '/intervenant';
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}
