import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCalendarMonthTitle } from '@/lib/diaryCalendar';
import { buildDiaryMonthShareText } from '@/lib/diaryMonthShare';
import { isAutoUsername } from '@/lib/profileHelpers';
import { copyTextToClipboard, shareOrCopyLink } from '@/lib/shareLink';
import { publicDiaryMonthUrl } from '@/lib/siteUrl';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { Capsule } from '@/types/capsule';

type Props = {
  username: string;
  year: number;
  month: number;
  /** Solo meses con ≥1 Capsule pública son shareables. */
  publicTotal: number;
  /** Capsules del mes (se filtran las públicas en el texto). */
  capsules?: Capsule[];
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
  capsules = [],
  displayName,
  className,
  size = 'sm',
  variant = 'secondary',
}: Props) {
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);

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
  const shareText = buildDiaryMonthShareText({
    name,
    year,
    month,
    capsules,
    monthUrl: url,
  });

  const markCopied = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const copySummary = async () => {
    setManualText(null);
    const result = await copyTextToClipboard(shareText);
    if (result === 'copied') {
      markCopied();
      toast.success('Resumen del mes copiado');
      return;
    }
    setManualText(shareText);
    toast.error('No se pudo copiar — selecciona el texto');
  };

  const share = async () => {
    setManualText(null);
    const result = await shareOrCopyLink({
      url,
      title,
      text: shareText,
      clipboardText: shareText,
    });

    if (result === 'copied') {
      markCopied();
      toast.success('Resumen del mes copiado');
      return;
    }

    if (result === 'shared') {
      toast.success('Mes compartido');
      return;
    }

    if (result === 'manual_needed') {
      setManualText(shareText);
      toast.error('No se pudo copiar — selecciona el texto');
    }
  };

  return (
    <div className={cn('inline-flex max-w-full flex-col items-stretch gap-1', className)}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={variant}
          size={size}
          onClick={() => void copySummary()}
          aria-label={copied ? 'Resumen del mes copiado' : 'Copiar resumen del mes'}
          data-testid="copy-diary-month"
        >
          {copied ? (
            <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          ) : (
            <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          )}
          {copied ? 'Copiado' : 'Copiar texto'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size={size}
          onClick={() => void share()}
          aria-label="Compartir mes del diario"
        >
          <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Compartir
        </Button>
      </div>
      {manualText ? (
        <label className="block max-w-xs text-left">
          <span className="sr-only">Copia el resumen del mes</span>
          <textarea
            readOnly
            rows={5}
            value={manualText}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground"
            aria-label="Texto del mes del diario"
          />
        </label>
      ) : null}
    </div>
  );
}
