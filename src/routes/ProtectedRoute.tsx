import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/database.types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  role?: string | string[];
}

export function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    
    if (!allowedRoles.includes(user.role)) {
      const redirectMap: Record<UserRole, string> = {
        SUPER_ADMIN: '/superadmin/dashboard',
        ADMIN: '/admin/dashboard',
        USER: '/user/dashboard',  // ⭐ ESTE ES EL CAMBIO CRÍTICO
      };
      
      return <Navigate to={redirectMap[user.role]} replace />;
    }
  }

  return <>{children}</>;
}