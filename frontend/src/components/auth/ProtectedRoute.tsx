import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FullPageSpinner } from '../layout/FullPageSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

/** Requires a signed-in user. Admins are sent to the admin area. */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role === 'admin') return <Navigate to="/admin/enquiries" replace />;
  return <>{children}</>;
}
