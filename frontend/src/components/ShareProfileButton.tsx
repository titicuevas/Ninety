import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAutoUsername } from '@/lib/profileHelpers';
import { buildProfileShareText, type ProfileShareSummary } from '@/lib/profileShare';
import { copyTextToClipboard, shareOrCopyLink } from '@/lib/shareLink';
import { publicProfileUrl } from '@/lib/siteUrl';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type Props = {
  username: string;
  displayName?: string | null;
  favoriteTeam?: string | null;
  city?: string | null;
  country?: string | null;
  publicCapsulesCount?: number | null;
  collectionsCount?: number | null;
  achievementsCount?: number | null;
  followersCount?: number | null;
  className?: string;
  size?: 'sm' | 'default';
  variant?: 'ghost' | 'outline' | 'secondary';
  /** Icono en móvil, etiqueta desde tablet. */
  compact?: boolean;
};

export function ShareProfileButton({
  username,
  displayName,
  favoriteTeam,
  city,
  country,
  publicCapsulesCount,
  collectionsCount,
  achievementsCount,
  followersCount,
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

  if (isAutoUsername(username)) {
    return (
      <Button asChild type="button" variant={variant} size={size} className={cn(className)}>
        <Link to="/profile" aria-label="Elige un username para compartir tu perfil">
          Elige username
        </Link>
      </Button>
    );
  }

  const summary: ProfileShareSummary = {
    username,
    displayName,
    favoriteTeam,
    city,
    country,
    publicCapsulesCount,
    collectionsCount,
    achievementsCount,
    followersCount,
  };
  const url = publicProfileUrl(username);
  const name = displayName?.trim() || `@${username}`;
  const title = `${name} en Ninety`;
  const shareText = buildProfileShareText(summary);

  const markCopied = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const copySummary = async () => {
    setManualText(null);
    const result = await copyTextToClipboard(shareText);
    if (result === 'copied') {
      markCopied();
      toast.success('Resumen del perfil copiado');
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
      toast.success('Resumen del perfil copiado');
      return;
    }

    if (result === 'shared') {
      toast.success('Perfil compartido');
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
          aria-label={copied ? 'Resumen del perfil copiado' : 'Copiar resumen del perfil'}
          data-testid="copy-profile-summary"
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
          aria-label="Compartir perfil"
        >
          <Share2 className={cn('h-3.5 w-3.5', iconMargin)} aria-hidden />
          <span className={labelClass}>Compartir</span>
        </Button>
      </div>
      {manualText ? (
        <label className="block max-w-xs text-left">
          <span className="sr-only">Copia el resumen del perfil</span>
          <textarea
            readOnly
            rows={5}
            value={manualText}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground"
            aria-label="Texto del perfil"
          />
        </label>
      ) : null}
    </div>
  );
}
