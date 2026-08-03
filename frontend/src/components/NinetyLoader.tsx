import { useEffect, useState } from 'react';
import { NINETY_LOADING_PHRASES, pickLoadingPhrase } from '@/lib/loadingCopy';
import { cn } from '@/lib/utils';

const ROTATE_MS = 2600;

type Variant = 'fullscreen' | 'panel' | 'inline';

type Props = {
  /** fullscreen: auth/app shell · panel: dentro de Layout · inline: cabecera de listas */
  variant?: Variant;
  /** Si se pasa, no rota; si no, cicla frases futboleras. */
  phrase?: string;
  rotate?: boolean;
  className?: string;
  /** Etiqueta accesible (por defecto la frase visible). */
  label?: string;
};

function PitchBall({ className }: { className?: string }) {
  return (
    <svg
      className={cn('ninety-loader-ball', className)}
      viewBox="0 0 40 40"
      width="40"
      height="40"
      aria-hidden
    >
      <circle cx="20" cy="20" r="18" fill="currentColor" className="text-primary/15" />
      <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/70" />
      <path
        d="M20 6.5 L26.5 11.2 L24.2 18.8 H15.8 L13.5 11.2 Z"
        fill="currentColor"
        className="text-primary/55"
      />
      <path
        d="M13.5 11.2 L8.2 14.8 L10.5 22.5 L15.8 18.8 M26.5 11.2 L31.8 14.8 L29.5 22.5 L24.2 18.8 M10.5 22.5 L15.8 29.5 H24.2 L29.5 22.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        className="text-primary/80"
      />
    </svg>
  );
}

function BrandMark({ size }: { size: 'lg' | 'sm' }) {
  const box = size === 'lg' ? 'h-14 w-14 text-base' : 'h-9 w-9 text-xs';
  return (
    <span
      className={cn(
        'ninety-loader-mark flex shrink-0 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground shadow-sm shadow-primary/25',
        box,
      )}
      aria-hidden
    >
      90
    </span>
  );
}

/**
 * Loading de marca Ninety — dark + verde, tipografía de producto, copy futbolero.
 */
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
        <BrandMark size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-foreground">Ninety</p>
          <p key={copy} className="ninety-loader-copy text-xs text-muted-foreground">
            {copy}
          </p>
        </div>
        <PitchBall className="ml-auto h-7 w-7 text-primary" />
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
      <div className="mb-5 flex items-center justify-center gap-3">
        <BrandMark size="lg" />
        <PitchBall className="h-11 w-11 text-primary" />
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
