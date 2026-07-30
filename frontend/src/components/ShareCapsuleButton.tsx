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
  /** Si es false, el botón queda deshabilitado (capsule privada). */
  isPublic?: boolean;
};

export function ShareCapsuleButton({
  capsuleId,
  title = 'Partido en Ninety',
  className,
  size = 'sm',
  variant = 'ghost',
  isPublic = true,
}: Props) {
  const [copied, setCopied] = useState(false);
  const url = publicCapsuleUrl(capsuleId);
  const disabled = !isPublic;

  const share = async () => {
    if (disabled) return;
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
      disabled={disabled}
      title={disabled ? 'Hazla pública para compartir el enlace' : undefined}
      aria-label={
        disabled
          ? 'Capsule privada: no se puede compartir'
          : copied
            ? 'Enlace copiado'
            : 'Compartir Capsule'
      }
    >
      {copied ? <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden /> : <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />}
      {disabled ? 'Privada' : copied ? 'Copiado' : 'Compartir'}
    </Button>
  );
}
