import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publicCapsuleUrl } from '@/lib/siteUrl';
import { cn } from '@/lib/utils';

type Props = {
  capsuleId: string;
  title?: string;
  className?: string;
  size?: 'sm' | 'default';
  variant?: 'ghost' | 'outline' | 'secondary';
};

export function ShareCapsuleButton({
  capsuleId,
  title = 'Partido en Ninety',
  className,
  size = 'sm',
  variant = 'ghost',
}: Props) {
  const [copied, setCopied] = useState(false);
  const url = publicCapsuleUrl(capsuleId);

  const share = async () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, url, text: title });
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
      aria-label={copied ? 'Enlace copiado' : 'Compartir Capsule'}
    >
      {copied ? <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden /> : <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />}
      {copied ? 'Copiado' : 'Compartir'}
    </Button>
  );
}
