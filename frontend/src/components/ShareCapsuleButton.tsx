import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shareOrCopyLink } from '@/lib/shareLink';
import { publicCapsuleUrl } from '@/lib/siteUrl';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type Props = {
  capsuleId: string;
  title?: string;
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
  className,
  size = 'sm',
  variant = 'ghost',
  isPublic = true,
  compact = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const url = publicCapsuleUrl(capsuleId);

  if (!isPublic) {
    return (
      <Button asChild type="button" variant={variant} size={size} className={cn(className)}>
        <Link to={`/capsules/${capsuleId}/edit`} aria-label="Hazla pública para compartir">
          Hazla pública
        </Link>
      </Button>
    );
  }

  const share = async () => {
    setManualUrl(null);
    const result = await shareOrCopyLink({
      url,
      title,
      text: `Vi este partido en Ninety: ${title}`,
    });

    if (result === 'copied') {
      setCopied(true);
      toast.success('Enlace de la Capsule copiado');
      window.setTimeout(() => setCopied(false), 2000);
      return;
    }

    if (result === 'shared') {
      toast.success('Capsule compartida');
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
        aria-label={copied ? 'Enlace copiado' : 'Compartir Capsule'}
        className={cn(compact && 'h-9 w-9 px-0 sm:w-auto sm:px-3')}
      >
        {copied ? (
          <Check className={cn('h-3.5 w-3.5', compact ? 'sm:mr-1.5' : 'mr-1.5')} aria-hidden />
        ) : (
          <Share2 className={cn('h-3.5 w-3.5', compact ? 'sm:mr-1.5' : 'mr-1.5')} aria-hidden />
        )}
        <span className={compact ? 'sr-only sm:not-sr-only' : undefined}>
          {copied ? 'Copiado' : 'Compartir'}
        </span>
      </Button>
      {manualUrl ? (
        <label className="block max-w-xs text-left">
          <span className="sr-only">Copia el enlace</span>
          <input
            readOnly
            value={manualUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground"
            aria-label="Enlace de la Capsule"
          />
        </label>
      ) : null}
    </div>
  );
}
