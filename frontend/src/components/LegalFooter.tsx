import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

const COPYRIGHT_YEAR = new Date().getFullYear();

const linkClass =
  'text-muted-foreground underline-offset-2 hover:text-primary hover:underline';

export function LegalFooter({ className }: { className?: string }) {
  const { t, format } = useI18n();

  return (
    <footer className={cn('text-center text-xs text-muted-foreground', className)}>
      <p className="flex flex-wrap items-center justify-center gap-x-0 gap-y-1">
        <Link to="/aviso-legal" className={linkClass}>
          {t.legalFooterNotice}
        </Link>
        <span className="mx-2 text-border" aria-hidden>
          ·
        </span>
        <Link to="/privacidad" className={linkClass}>
          {t.legalFooterPrivacy}
        </Link>
        <span className="mx-2 text-border" aria-hidden>
          ·
        </span>
        <Link to="/terminos" className={linkClass}>
          {t.legalFooterTerms}
        </Link>
      </p>
      <p className="mt-2">{format(t.legalFooterCopyright, { year: COPYRIGHT_YEAR })}</p>
    </footer>
  );
}
