import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthInit, useAuth } from '@/hooks/useAuthInit';
import {
  DEFAULT_POST_AUTH_PATH,
  locationReturnPath,
  loginPath,
  parseNextParam,
  safeReturnPath,
} from '@/lib/authReturn';

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
  const location = useLocation();

  if (loading) return <LoadingSpinner />;
  if (!user) {
    return <Navigate to={loginPath(locationReturnPath(location))} replace />;
  }
  return <Outlet />;
}

export function GuestRoute() {
  useAuthInit();
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;
  if (user) {
    const next = parseNextParam(location.search);
    return <Navigate to={safeReturnPath(next, DEFAULT_POST_AUTH_PATH)} replace />;
  }
  return <Outlet />;
}
