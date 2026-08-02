import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shareOrCopyLink } from '@/lib/shareLink';
import { publicCollectionUrl } from '@/lib/siteUrl';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type Props = {
  username: string;
  slug: string;
  name: string;
  className?: string;
  size?: 'sm' | 'default';
  variant?: 'ghost' | 'outline' | 'secondary';
};

export function ShareCollectionButton({
  username,
  slug,
  name,
  className,
  size = 'sm',
  variant = 'secondary',
}: Props) {
  const [copied, setCopied] = useState(false);
  const [manualUrl, setManualUrl] = useState<string | null>(null);

  const url = publicCollectionUrl(username, slug);
  const title = `${name} · Ninety`;
  const text = `Colección «${name}» en Ninety`;

  const share = async () => {
    setManualUrl(null);
    const result = await shareOrCopyLink({ url, title, text });

    if (result === 'copied') {
      setCopied(true);
      toast.success('Enlace de la colección copiado');
      window.setTimeout(() => setCopied(false), 2000);
      return;
    }

    if (result === 'shared') {
      toast.success('Colección compartida');
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
        aria-label={copied ? 'Enlace copiado' : 'Compartir colección'}
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
            aria-label="Enlace de la colección"
          />
        </label>
      ) : null}
    </div>
  );
}
