import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { LegalFooter } from '@/components/LegalFooter';

export function LegalPageLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al inicio
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              90
            </span>
            <span className="text-lg font-semibold">Ninety</span>
          </div>
        </header>

        <main className="flex-1">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mb-8 text-sm text-muted-foreground">Última actualización: 5 de julio de 2026</p>
          <div className="prose-legal space-y-6 text-sm leading-relaxed text-muted-foreground">{children}</div>
        </main>

        <LegalFooter className="mt-12 border-t border-border pt-8" />
      </div>
    </div>
  );
}
