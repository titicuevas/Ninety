import { Navigate, Outlet } from 'react-router-dom';
import { useAuthInit, useAuth } from '@/hooks/useAuthInit';

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export function ProtectedRoute() {
  useAuthInit();
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function GuestRoute() {
  useAuthInit();
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (user) return <Navigate to="/home" replace />;
  return <Outlet />;
}
