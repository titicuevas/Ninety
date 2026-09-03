import { useEffect, useMemo, useState } from 'react';
import { NinetyLogo } from '@/components/NinetyLogo';
import { NINETY_LOADING_PHRASES, pickLoadingPhrase } from '@/lib/loadingCopy';
import { cn } from '@/lib/utils';

const ROTATE_MS = 2600;

type Variant = 'fullscreen' | 'panel' | 'inline';

type Props = {
  /** fullscreen: auth/app shell · panel: dentro de Layout · inline: cabecera de listas */
  variant?: Variant;
  phrase?: string;
  rotate?: boolean;
  className?: string;
  label?: string;
};

/* ── Animaciones de loader ─────────────────────────────────── */

function BouncingBall({ className }: { className?: string }) {
  return (
    <div className={cn('ninety-bounce-ball', className)} aria-hidden>
      <svg viewBox="0 0 32 32" className="h-full w-full">
        <circle cx="16" cy="16" r="14" fill="currentColor" className="text-primary/20" />
        <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/60" />
        <path d="M16 5.5 L21 9 L19.2 15 H12.8 L11 9 Z" fill="currentColor" className="text-primary/45" />
        <path
          d="M11 9 L7 12 L8.5 18 L12.8 15 M21 9 L25 12 L23.5 18 L19.2 15 M8.5 18 L12.8 24 H19.2 L23.5 18"
          fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" className="text-primary/70"
        />
      </svg>
    </div>
  );
}

function PulsingWhistle({ className }: { className?: string }) {
  return (
    <div className={cn('ninety-pulse-whistle', className)} aria-hidden>
      <svg viewBox="0 0 32 32" className="h-full w-full">
        <circle cx="16" cy="16" r="12" fill="currentColor" className="text-primary/10" />
        <ellipse cx="16" cy="16" rx="7" ry="5" fill="currentColor" className="text-primary/50" />
        <rect x="22" y="13" width="6" height="3" rx="1.5" fill="currentColor" className="text-primary/60" />
        <circle cx="12" cy="16" r="2.5" fill="currentColor" className="text-primary/80" />
        <line x1="6" y1="8" x2="9" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary/40" />
        <line x1="10" y1="6" x2="11" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary/40" />
        <line x1="4" y1="12" x2="8" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary/40" />
      </svg>
    </div>
  );
}

function SpinningCard({ className }: { className?: string }) {
  return (
    <div className={cn('ninety-spin-card', className)} aria-hidden>
      <svg viewBox="0 0 32 32" className="h-full w-full">
        <rect x="8" y="4" width="16" height="24" rx="2" fill="currentColor" className="text-yellow-500/70" />
        <rect x="10" y="6" width="12" height="8" rx="1" fill="currentColor" className="text-yellow-300/40" />
        <circle cx="16" cy="20" r="3" fill="currentColor" className="text-yellow-300/50" />
      </svg>
    </div>
  );
}

function GoalNet({ className }: { className?: string }) {
  return (
    <div className={cn('ninety-goal-net', className)} aria-hidden>
      <svg viewBox="0 0 32 32" className="h-full w-full">
        <rect x="4" y="8" width="24" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/50" />
        {/* Red diagonal */}
        <line x1="4" y1="8" x2="16" y2="26" stroke="currentColor" strokeWidth="0.75" className="text-primary/25" />
        <line x1="16" y1="8" x2="28" y2="26" stroke="currentColor" strokeWidth="0.75" className="text-primary/25" />
        <line x1="28" y1="8" x2="16" y2="26" stroke="currentColor" strokeWidth="0.75" className="text-primary/25" />
        <line x1="16" y1="8" x2="4" y2="26" stroke="currentColor" strokeWidth="0.75" className="text-primary/25" />
        {/* Horizontal */}
        <line x1="4" y1="17" x2="28" y2="17" stroke="currentColor" strokeWidth="0.75" className="text-primary/20" />
        {/* Balón entrando */}
        <circle cx="16" cy="18" r="3.5" fill="currentColor" className="text-primary/60 ninety-goal-ball" />
      </svg>
    </div>
  );
}

const LOADER_ICONS = [BouncingBall, PulsingWhistle, SpinningCard, GoalNet] as const;

function pickLoaderIcon() {
  return LOADER_ICONS[Math.floor(Math.random() * LOADER_ICONS.length)]!;
}

/* ── Componente principal ──────────────────────────────────── */

export function NinetyLoader({
  variant = 'fullscreen',
  phrase,
  rotate = phrase == null,
  className,
  label,
}: Props) {
  const [tick, setTick] = useState(0);
  const copy = phrase ?? pickLoadingPhrase(tick);
  const a11y = label ?? copy;
  const LoaderIcon = useMemo(pickLoaderIcon, []);

  useEffect(() => {
    if (!rotate || phrase != null) return;
    const id = window.setInterval(() => {
      setTick((t) => (t + 1) % NINETY_LOADING_PHRASES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [rotate, phrase]);

  if (variant === 'inline') {
    return (
      <div
        className={cn('flex items-center gap-3 py-1', className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={a11y}
      >
        <NinetyLogo size="xs" animate />
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-foreground">Ninety</p>
          <p key={copy} className="ninety-loader-copy text-xs text-muted-foreground">
            {copy}
          </p>
        </div>
        <LoaderIcon className="ml-auto h-6 w-6" />
      </div>
    );
  }

  const shell =
    variant === 'fullscreen'
      ? 'flex min-h-dvh flex-col items-center justify-center bg-background px-6'
      : 'flex flex-col items-center justify-center px-4 py-16';

  return (
    <div
      className={cn(shell, 'app-shell text-center', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={a11y}
    >
      <div className="mb-5 flex items-center justify-center gap-4">
        <NinetyLogo size="lg" animate />
        <LoaderIcon className="h-9 w-9" />
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground">Ninety</p>
      <p
        key={copy}
        className="ninety-loader-copy mt-2 max-w-[16rem] text-sm text-muted-foreground sm:text-base"
      >
        {copy}
      </p>
    </div>
  );
}
