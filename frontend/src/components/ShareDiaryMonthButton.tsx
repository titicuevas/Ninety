import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCalendarMonthTitle } from '@/lib/diaryCalendar';
import { isAutoUsername } from '@/lib/profileHelpers';
import { shareOrCopyLink } from '@/lib/shareLink';
import { publicDiaryMonthUrl } from '@/lib/siteUrl';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type Props = {
  username: string;
  year: number;
  month: number;
  /** Solo meses con ≥1 Capsule pública son shareables. */
  publicTotal: number;
  displayName?: string | null;
  className?: string;
  size?: 'sm' | 'default';
  variant?: 'ghost' | 'outline' | 'secondary' | 'default';
};

export function ShareDiaryMonthButton({
  username,
  year,
  month,
  publicTotal,
  displayName,
  className,
  size = 'sm',
  variant = 'secondary',
}: Props) {
  const [copied, setCopied] = useState(false);
  const [manualUrl, setManualUrl] = useState<string | null>(null);

  if (isAutoUsername(username)) {
    return (
      <Button asChild type="button" variant={variant} size={size} className={cn(className)}>
        <Link to="/profile" aria-label="Elige un username para compartir el mes">
          Elige username para compartir
        </Link>
      </Button>
    );
  }

  if (publicTotal <= 0) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(className)}
        disabled
        title="Solo se pueden compartir meses con Capsules públicas"
      >
        <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Sin Capsules públicas
      </Button>
    );
  }

  const url = publicDiaryMonthUrl(username, year, month);
  const monthTitle = formatCalendarMonthTitle(year, month);
  const name = displayName?.trim() || `@${username}`;
  const title = `${monthTitle} · Ninety`;
  const text = `Mes de ${name} en Ninety — ${monthTitle}`;

  const share = async () => {
    setManualUrl(null);
    const result = await shareOrCopyLink({ url, title, text });

    if (result === 'copied') {
      setCopied(true);
      toast.success('Enlace del mes copiado');
      window.setTimeout(() => setCopied(false), 2000);
      return;
    }

    if (result === 'shared') {
      toast.success('Mes compartido');
      return;
    }

    if (result === 'manual_needed') {
      setManualUrl(url);
      toast.error('No se pudo copiar — selecciona el enlace');
    }
  };

  return (
    <div className={cn('inline-flex max-w-full flex-col items-stretch gap-1', className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => void share()}
        aria-label={copied ? 'Enlace del mes copiado' : 'Compartir mes del diario'}
      >
        {copied ? (
          <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        ) : (
          <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        )}
        {copied ? 'Copiado' : 'Compartir mes'}
      </Button>
      {manualUrl ? (
        <label className="block max-w-xs text-left">
          <span className="sr-only">Copia el enlace del mes</span>
          <input
            readOnly
            value={manualUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground"
            aria-label="Enlace del mes del diario"
          />
        </label>
      ) : null}
    </div>
  );
}
