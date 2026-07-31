import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useToggleCapsuleLike } from '@/hooks/useCapsules';
import { friendlyApiError } from '@/lib/friendlyErrors';
import { cn } from '@/lib/utils';

interface CapsuleLikeButtonProps {
  capsuleId: string;
  likesCount?: number;
  likedByMe?: boolean;
  className?: string;
}

export function CapsuleLikeButton({
  capsuleId,
  likesCount = 0,
  likedByMe = false,
  className,
}: CapsuleLikeButtonProps) {
  const toggle = useToggleCapsuleLike();
  const [pop, setPop] = useState(false);

  const handleClick = () => {
    if (!likedByMe) {
      setPop(true);
      window.setTimeout(() => setPop(false), 200);
    }
    toggle.mutate({ capsuleId, liked: likedByMe });
  };

  return (
    <div className={cn('inline-flex flex-col items-start gap-1', className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={toggle.isPending}
        aria-pressed={likedByMe}
        aria-busy={toggle.isPending || undefined}
        aria-label={likedByMe ? 'Quitar me gusta' : 'Me gusta'}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
          'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          likedByMe ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Heart
          className={cn(
            'h-4 w-4 shrink-0 transition-colors',
            likedByMe && 'fill-primary text-primary',
            pop && 'motion-pop',
          )}
          aria-hidden="true"
        />
        <span className="tabular-nums">{likesCount > 0 ? likesCount : 'Me gusta'}</span>
      </button>
      {toggle.isError ? (
        <p className="max-w-[10rem] text-xs text-destructive">
          {toggle.error instanceof Error
            ? friendlyApiError(toggle.error.message)
            : 'No se pudo actualizar'}
        </p>
      ) : null}
    </div>
  );
}
