import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAutoUsername } from '@/lib/profileHelpers';
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

  if (isAutoUsername(username)) return null;

  const url = publicProfileUrl(username);
  const name = displayName?.trim() || `@${username}`;
  const title = `${name} en Ninety`;
  const text = `Mira el diario futbolero de ${name}`;

  const share = async () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, url, text });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard no disponible */
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
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
  );
}
