import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuthInit';
import { authRequiredPath } from '@/lib/authGate';

/**
 * Gate de mutaciones para invitados: si no hay sesión, redirige a registro
 * (o login) con `?next=` a la ubicación actual. Devuelve true si puede continuar.
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (opts?: { prefer?: 'register' | 'login' }) => {
    if (user) return true;
    navigate(authRequiredPath(location, opts?.prefer ?? 'register'));
    return false;
  };
}
