import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAutoUsername } from '@/lib/profileHelpers';
import { inviteUrl } from '@/lib/inviteReferral';
import { shareOrCopyLink } from '@/lib/shareLink';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type Props = {
  username: string;
  displayName?: string | null;
  className?: string;
  size?: 'sm' | 'default';
  variant?: 'ghost' | 'outline' | 'secondary' | 'default';
};

export function ShareInviteButton({
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
        <Link to="/profile" aria-label="Elige un username para invitar amigos">
          Elige username para invitar
        </Link>
      </Button>
    );
  }

  const url = inviteUrl(username);
  const name = displayName?.trim() || `@${username}`;
  const title = 'Únete a Ninety';
  const text = `${name} te invita a Ninety — tu diario futbolero`;

  const share = async () => {
    setManualUrl(null);
    const result = await shareOrCopyLink({ url, title, text });

    if (result === 'copied') {
      setCopied(true);
      toast.success('Enlace de invitación copiado');
      window.setTimeout(() => setCopied(false), 2000);
      return;
    }

    if (result === 'shared') {
      toast.success('Invitación compartida');
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
        aria-label={copied ? 'Enlace de invitación copiado' : 'Invitar a Ninety'}
      >
        {copied ? (
          <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        ) : (
          <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        )}
        {copied ? 'Copiado' : 'Invitar'}
      </Button>
      {manualUrl ? (
        <label className="block max-w-xs text-left">
          <span className="sr-only">Copia el enlace de invitación</span>
          <input
            readOnly
            value={manualUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground"
            aria-label="Enlace de invitación"
          />
        </label>
      ) : null}
    </div>
  );
}
