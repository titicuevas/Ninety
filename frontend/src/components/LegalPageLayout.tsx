import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { LegalFooter } from '@/components/LegalFooter';
import { SkipLink } from '@/components/SkipLink';

export function LegalPageLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="app-shell min-h-dvh text-foreground">
      <SkipLink />
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-12">
        <header className="mb-8">
          <Link
            to="/"
            className="mb-6 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al inicio
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              90
            </span>
            <span className="text-lg font-semibold">Ninety</span>
          </div>
        </header>

        <main id="main-content" className="flex-1">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mb-8 text-sm text-muted-foreground">Última actualización: 5 de julio de 2026</p>
          <div className="prose-legal space-y-6 text-sm leading-relaxed text-muted-foreground">{children}</div>
        </main>

        <LegalFooter className="mt-12 border-t border-border pt-8" />
      </div>
    </div>
  );
}
