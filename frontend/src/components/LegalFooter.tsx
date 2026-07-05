import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('text-center text-xs text-muted-foreground', className)}>
      <p>
        <Link to="/privacidad" className="hover:text-foreground hover:underline">
          Privacidad
        </Link>
        <span className="mx-2 text-border">·</span>
        <Link to="/terminos" className="hover:text-foreground hover:underline">
          Términos
        </Link>
      </p>
      <p className="mt-2">© {new Date().getFullYear()} Ninety</p>
    </footer>
  );
}
