import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const COPYRIGHT_YEAR = new Date().getFullYear();

export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('text-center text-xs text-muted-foreground', className)}>
      <p>
        <Link
          to="/privacidad"
          className="text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
        >
          Privacidad
        </Link>
        <span className="mx-2 text-border">·</span>
        <Link
          to="/terminos"
          className="text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
        >
          Términos
        </Link>
      </p>
      <p className="mt-2">
        © {COPYRIGHT_YEAR} Ninety · getninety.app
      </p>
    </footer>
  );
}
