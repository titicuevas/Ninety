import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  acceptCookieNotice,
  readCookieNoticeAccepted,
} from '@/lib/cookieNoticeMemory';
import { cn } from '@/lib/utils';

type Phase = 'enter' | 'exit' | 'gone';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Aviso de almacenamiento esencial (sin cookies de marketing/analytics). */
export function CookieNoticeBanner({ className }: { className?: string }) {
  const [phase, setPhase] = useState<Phase>(() =>
    readCookieNoticeAccepted() ? 'gone' : 'enter',
  );

  useEffect(() => {
    if (phase !== 'exit') return;
    const t = window.setTimeout(() => setPhase('gone'), 280);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === 'gone') return null;

  const dismiss = () => {
    acceptCookieNotice();
    if (prefersReducedMotion()) {
      setPhase('gone');
      return;
    }
    setPhase('exit');
  };

  return (
    <div
      role="region"
      aria-labelledby="cookie-notice-title"
      aria-describedby="cookie-notice-desc"
      data-testid="cookie-notice"
      data-phase={phase}
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        if (phase === 'exit') setPhase('gone');
      }}
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-0 z-[60] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4',
        phase === 'enter' && 'motion-cookie-enter',
        phase === 'exit' && 'motion-cookie-exit',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-auto relative mx-auto flex max-w-xl flex-col gap-3 overflow-hidden',
          'rounded-2xl border border-primary/25 bg-zinc-950 p-4 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.85)]',
          'ring-1 ring-white/[0.06] sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4',
          /* Blur solo con ratón fino: tablets táctiles ≥sm no pagan backdrop-filter */
          '[@media(hover:hover)_and_(pointer:fine)]:bg-zinc-950/90 [@media(hover:hover)_and_(pointer:fine)]:backdrop-blur-md',
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-primary/15 blur-2xl max-sm:hidden"
          aria-hidden
        />

        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>

        <div className="relative min-w-0 flex-1 text-left">
          <p id="cookie-notice-title" className="text-sm font-semibold tracking-tight text-foreground">
            Jugada limpia con tus datos
          </p>
          <p id="cookie-notice-desc" className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Sin cookies de publicidad ni analítica de terceros. Solo lo esencial para tu sesión en este
            dispositivo.{' '}
            <Link
              to="/privacidad"
              className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Privacidad
            </Link>
          </p>
        </div>

        <Button
          type="button"
          className="relative min-h-11 w-full shrink-0 sm:w-auto sm:min-w-[7.5rem]"
          onClick={dismiss}
          data-testid="cookie-notice-accept"
        >
          Entendido
        </Button>
      </div>
    </div>
  );
}
