import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAutoUsername } from '@/lib/profileHelpers';
import { shareOrCopyLink } from '@/lib/shareLink';
import { publicProfileUrl } from '@/lib/siteUrl';
import { cn } from '@/lib/utils';

type Props = {
  username: string;
  displayName?: string | null;
  className?: string;
  size?: 'sm' | 'default';
  variant?: 'ghost' | 'outline' | 'secondary';
};

export function ShareProfileButton({
  username,
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
        <Link to="/profile" aria-label="Elige un username para compartir tu perfil">
          Elige username
        </Link>
      </Button>
    );
  }

  const url = publicProfileUrl(username);
  const name = displayName?.trim() || `@${username}`;
  const title = `${name} en Ninety`;
  const text = `Mira el diario futbolero de ${name}`;

  const share = async () => {
    setManualUrl(null);
    const result = await shareOrCopyLink({ url, title, text });

    if (result === 'copied') {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      return;
    }

    if (result === 'manual_needed') {
      setManualUrl(url);
    }
  };

  return (
    <div className={cn('inline-flex max-w-full flex-col items-stretch gap-1', className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => void share()}
        aria-label={copied ? 'Enlace del perfil copiado' : 'Compartir perfil'}
      >
        {copied ? (
          <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        ) : (
          <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        )}
        {copied ? 'Copiado' : 'Compartir'}
      </Button>
      {manualUrl ? (
        <label className="block max-w-xs text-left">
          <span className="sr-only">Copia el enlace</span>
          <input
            readOnly
            value={manualUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground"
            aria-label="Enlace del perfil"
          />
        </label>
      ) : null}
    </div>
  );
}
