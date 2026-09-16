import { Link } from 'react-router-dom';
import { LegalFooter } from '@/components/LegalFooter';
import { NinetyLogo } from '@/components/NinetyLogo';
import { SkipLink } from '@/components/SkipLink';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
};

/** Shell compartido para login / registro — atmósfera noche de partido + marca. */
export function AuthLayout({ title, subtitle, children, className }: Props) {
  return (
    <div className="relative flex min-h-screen min-h-dvh flex-col bg-background text-foreground">
      <SkipLink />
      <div className="relative flex min-h-screen min-h-dvh flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="landing-pitch absolute inset-0 opacity-90" />
          <div className="landing-floodlight motion-glow absolute inset-x-0 top-0 h-[45vh] opacity-80" />
          <div className="landing-grain absolute inset-0 opacity-[0.18]" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pt-[max(2.5rem,env(safe-area-inset-top,0px))] pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] sm:px-6">
          <div className={cn('motion-auth w-full max-w-md', className)}>
            <div className="mb-8 text-center">
              <Link
                to="/"
                className="inline-flex flex-col items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <NinetyLogo
                  size="md"
                  className="transition-transform duration-300 hover:scale-[1.03]"
                />
                <span className="font-display text-5xl font-extrabold leading-none tracking-[-0.02em] sm:text-6xl">
                  Ninety
                </span>
              </Link>
              <h1 className="mt-6 text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-zinc-400 sm:text-base">{subtitle}</p>
            </div>

            <main
              id="main-content"
              tabIndex={-1}
              className="rounded-2xl border border-white/10 bg-zinc-950/90 p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.85)] outline-none sm:p-7"
            >
              {children}
            </main>

            <LegalFooter className="mt-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
