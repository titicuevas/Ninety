import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  acceptCookieNotice,
  readCookieNoticeAccepted,
} from '@/lib/cookieNoticeMemory';
import { cn } from '@/lib/utils';

/** Aviso de almacenamiento esencial (sin cookies de marketing/analytics). */
export function CookieNoticeBanner({ className }: { className?: string }) {
  const [visible, setVisible] = useState(() => !readCookieNoticeAccepted());

  if (!visible) return null;

  const dismiss = () => {
    acceptCookieNotice();
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-notice-title"
      aria-describedby="cookie-notice-desc"
      data-testid="cookie-notice"
      className={cn(
        'fixed inset-x-0 bottom-0 z-[60] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4',
        className,
      )}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-xl shadow-black/40 backdrop-blur-md sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Shield className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p id="cookie-notice-title" className="text-sm font-semibold text-foreground">
            Jugada limpia con tus datos
          </p>
          <p id="cookie-notice-desc" className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Ninety no usa cookies de publicidad ni analítica de terceros. Solo guardamos lo
            esencial para que puedas entrar (sesión en tu dispositivo). Más detalle en{' '}
            <Link
              to="/privacidad"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Privacidad
            </Link>
            .
          </p>
        </div>
        <Button type="button" className="min-h-11 w-full shrink-0 sm:w-auto" onClick={dismiss}>
          Entendido
        </Button>
      </div>
    </div>
  );
}
