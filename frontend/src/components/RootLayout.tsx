import { Outlet } from 'react-router-dom';
import { AnalyticsBeacon } from '@/components/AnalyticsBeacon';
import { CookieNoticeBanner } from '@/components/CookieNoticeBanner';

/** Layout raíz: rutas + aviso de almacenamiento esencial. */
export function RootLayout() {
  return (
    <>
      <AnalyticsBeacon />
      <Outlet />
      <CookieNoticeBanner />
    </>
  );
}
