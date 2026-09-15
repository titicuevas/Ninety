import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const COPYRIGHT_YEAR = new Date().getFullYear();

const linkClass =
  'text-muted-foreground underline-offset-2 hover:text-primary hover:underline';

export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('text-center text-xs text-muted-foreground', className)}>
      <p className="flex flex-wrap items-center justify-center gap-x-0 gap-y-1">
        <Link to="/aviso-legal" className={linkClass}>
          Aviso legal
        </Link>
        <span className="mx-2 text-border" aria-hidden>
          ·
        </span>
        <Link to="/privacidad" className={linkClass}>
          Privacidad
        </Link>
        <span className="mx-2 text-border" aria-hidden>
          ·
        </span>
        <Link to="/terminos" className={linkClass}>
          Términos
        </Link>
      </p>
      <p className="mt-2">
        © {COPYRIGHT_YEAR} Ninety · getninety.app
      </p>
    </footer>
  );
}
