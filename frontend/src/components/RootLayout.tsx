import { Outlet } from 'react-router-dom';
import { CookieNoticeBanner } from '@/components/CookieNoticeBanner';

/** Layout raíz: rutas + aviso de almacenamiento esencial. */
export function RootLayout() {
  return (
    <>
      <Outlet />
      <CookieNoticeBanner />
    </>
  );
}
