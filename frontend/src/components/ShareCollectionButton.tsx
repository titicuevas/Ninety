import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildCollectionShareText,
  type CollectionShareSummary,
} from '@/lib/collectionShare';
import { copyTextToClipboard, shareOrCopyLink } from '@/lib/shareLink';
import { publicCollectionUrl } from '@/lib/siteUrl';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type Props = {
  username: string;
  slug: string;
  name: string;
  description?: string | null;
  authorDisplayName?: string | null;
  itemsCount?: number | null;
  likesCount?: number | null;
  className?: string;
  size?: 'sm' | 'default';
  variant?: 'ghost' | 'outline' | 'secondary';
  /** Icono en móvil, etiqueta desde tablet. */
  compact?: boolean;
};

export function ShareCollectionButton({
  username,
  slug,
  name,
  description,
  authorDisplayName,
  itemsCount,
  likesCount,
  className,
  size = 'sm',
  variant = 'secondary',
  compact = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);
  const iconBtn = compact ? 'h-9 w-9 px-0 sm:w-auto sm:px-3' : undefined;
  const iconMargin = compact ? 'sm:mr-1.5' : 'mr-1.5';
  const labelClass = compact ? 'sr-only sm:not-sr-only' : undefined;

  const summary: CollectionShareSummary = {
    name,
    username,
    slug,
    description,
    authorDisplayName,
    itemsCount,
    likesCount,
  };
  const url = publicCollectionUrl(username, slug);
  const title = `${name.trim() || 'Colección'} · Ninety`;
  const shareText = buildCollectionShareText(summary);

  const markCopied = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const copySummary = async () => {
    setManualText(null);
    const result = await copyTextToClipboard(shareText);
    if (result === 'copied') {
      markCopied();
      toast.success('Resumen de la lista copiado');
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
      toast.success('Resumen de la lista copiado');
      return;
    }

    if (result === 'shared') {
      toast.success('Colección compartida');
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
          aria-label={copied ? 'Resumen de la lista copiado' : 'Copiar resumen de la lista'}
          data-testid="copy-collection-summary"
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
          onClick={() => void share()}
          aria-label="Compartir colección"
        >
          <Share2 className={cn('h-3.5 w-3.5', iconMargin)} aria-hidden />
          <span className={labelClass}>Compartir</span>
        </Button>
      </div>
      {manualText ? (
        <label className="block max-w-xs text-left">
          <span className="sr-only">Copia el resumen de la lista</span>
          <textarea
            readOnly
            rows={5}
            value={manualText}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground"
            aria-label="Texto de la colección"
          />
        </label>
      ) : null}
    </div>
  );
}
