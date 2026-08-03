import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { LegalFooter } from '@/components/LegalFooter';
import { SkipLink } from '@/components/SkipLink';

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="scroll-mt-8">
      <h2 className="mb-3 text-base font-semibold tracking-tight text-foreground sm:text-lg">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem] sm:leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export function LegalPageLayout({
  title,
  updatedAt = '3 de agosto de 2026',
  children,
}: {
  title: string;
  updatedAt?: string;
  children: ReactNode;
}) {
  return (
    <div className="landing-page min-h-dvh text-foreground">
      <SkipLink />
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-12">
        <header className="mb-10 sm:mb-12">
          <Link
            to="/"
            className="mb-8 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al inicio
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25">
              90
            </span>
            <div>
              <p className="text-xl font-semibold tracking-tight sm:text-2xl">Ninety</p>
              <p className="text-xs text-muted-foreground">getninety.app</p>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1">
          <p className="mb-3 inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-medium text-emerald-300">
            Documento legal · beta
          </p>
          <h1 className="mb-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mb-8 text-sm text-muted-foreground sm:mb-10">Última actualización: {updatedAt}</p>
          <div className="prose-legal space-y-8 border-t border-border/80 pt-8">{children}</div>
        </main>

        <LegalFooter className="mt-12 border-t border-border/80 pt-8 sm:mt-16" />
      </div>
    </div>
  );
}
