import { Link } from 'react-router-dom';
import { LegalFooter } from '@/components/LegalFooter';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
};

/** Shell compartido para login / registro — atmósfera + panel centrado. */
export function AuthLayout({ title, subtitle, children, className }: Props) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(16,185,129,0.06),_transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to top, black, transparent)',
        }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className={cn('w-full max-w-md', className)}>
          <div className="mb-8 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25">
                90
              </span>
              <span className="text-2xl font-semibold tracking-tight">Ninety</span>
            </Link>
            <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/80 p-5 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-7">
            {children}
          </div>

          <LegalFooter className="mt-8" />
        </div>
      </div>
    </div>
  );
}
