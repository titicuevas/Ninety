import { useLocation } from 'react-router-dom';
import { locationReturnPath, loginPath, registerPath } from '@/lib/authReturn';

/** Links de login/registro que vuelven a la ubicación actual tras autenticarse. */
export function useAuthReturnLinks() {
  const location = useLocation();
  const returnTo = locationReturnPath(location);
  return {
    returnTo,
    loginTo: loginPath(returnTo),
    registerTo: registerPath(returnTo),
  };
}
