import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildCapsuleShareText,
  type CapsuleShareSummary,
} from '@/lib/capsuleShare';
import { copyTextToClipboard, shareOrCopyLink } from '@/lib/shareLink';
import { publicCapsuleUrl } from '@/lib/siteUrl';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type Props = {
  capsuleId: string;
  title?: string;
  share?: CapsuleShareSummary;
  className?: string;
  size?: 'sm' | 'default';
  variant?: 'ghost' | 'outline' | 'secondary';
  /** Si es false, ofrece ir a editar para hacerla pública. */
  isPublic?: boolean;
  /** Icono en móvil, etiqueta desde tablet. */
  compact?: boolean;
};

export function ShareCapsuleButton({
  capsuleId,
  title = 'Partido en Ninety',
  share,
  className,
  size = 'sm',
  variant = 'ghost',
  isPublic = true,
  compact = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);
  const iconBtn = compact ? 'h-9 w-9 px-0 sm:w-auto sm:px-3' : undefined;
  const iconMargin = compact ? 'sm:mr-1.5' : 'mr-1.5';
  const labelClass = compact ? 'sr-only sm:not-sr-only' : undefined;
  const url = publicCapsuleUrl(capsuleId);
  const shareText = share
    ? buildCapsuleShareText(share)
    : buildCapsuleShareText({
        capsuleId,
        homeTeam: title.includes(' vs ') ? title.split(' vs ')[0]! : title,
        awayTeam: title.includes(' vs ') ? title.split(' vs ').slice(1).join(' vs ') : '',
      });

  if (!isPublic) {
    return (
      <Button asChild type="button" variant={variant} size={size} className={cn(className)}>
        <Link to={`/capsules/${capsuleId}/edit`} aria-label="Hazla pública para compartir">
          Hazla pública
        </Link>
      </Button>
    );
  }

  const markCopied = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const copySummary = async () => {
    setManualText(null);
    const result = await copyTextToClipboard(shareText);
    if (result === 'copied') {
      markCopied();
      toast.success('Resumen de la Capsule copiado');
      return;
    }
    setManualText(shareText);
    toast.error('No se pudo copiar — selecciona el texto');
  };

  const shareNative = async () => {
    setManualText(null);
    const result = await shareOrCopyLink({
      url,
      title,
      text: shareText,
      clipboardText: shareText,
    });

    if (result === 'copied') {
      markCopied();
      toast.success('Resumen de la Capsule copiado');
      return;
    }

    if (result === 'shared') {
      toast.success('Capsule compartida');
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
          className={iconBtn}
          onClick={() => void copySummary()}
          aria-label={copied ? 'Resumen de la Capsule copiado' : 'Copiar resumen de la Capsule'}
          data-testid="copy-capsule-summary"
        >
          {copied ? (
            <Check className={cn('h-3.5 w-3.5', iconMargin)} aria-hidden />
          ) : (
            <Copy className={cn('h-3.5 w-3.5', iconMargin)} aria-hidden />
          )}
          <span className={labelClass}>{copied ? 'Copiado' : 'Copiar texto'}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size={size}
          className={iconBtn}
          onClick={() => void shareNative()}
          aria-label={copied ? 'Enlace copiado' : 'Compartir Capsule'}
        >
          <Share2 className={cn('h-3.5 w-3.5', iconMargin)} aria-hidden />
          <span className={labelClass}>Compartir</span>
        </Button>
      </div>
      {manualText ? (
        <label className="block max-w-xs text-left">
          <span className="sr-only">Copia el resumen de la Capsule</span>
          <textarea
            readOnly
            rows={5}
            value={manualText}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground"
            aria-label="Texto de la Capsule"
          />
        </label>
      ) : null}
    </div>
  );
}
