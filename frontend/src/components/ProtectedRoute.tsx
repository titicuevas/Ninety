import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { NinetyLoader } from '@/components/NinetyLoader';
import { useAuthInit, useAuth } from '@/hooks/useAuthInit';
import {
  DEFAULT_POST_AUTH_PATH,
  locationReturnPath,
  loginPath,
  parseNextParam,
  safeReturnPath,
} from '@/lib/authReturn';
import { loadSession } from '@/lib/session';

export function ProtectedRoute() {
  useAuthInit();
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <NinetyLoader variant="fullscreen" />;
  if (!user) {
    return <Navigate to={loginPath(locationReturnPath(location))} replace />;
  }
  return <Outlet />;
}

export function GuestRoute() {
  useAuthInit();
  const { user, loading } = useAuth();
  const location = useLocation();

  if (user) {
    const next = parseNextParam(location.search);
    return <Navigate to={safeReturnPath(next, DEFAULT_POST_AUTH_PATH)} replace />;
  }
  // Solo gate si hay sesión a restaurar — guests ven login/register al instante.
  if (loading && loadSession()) {
    return <NinetyLoader variant="fullscreen" />;
  }
  return <Outlet />;
}
