import { useState } from 'react';
import { Heart } from 'lucide-react';
import { CapsuleLikersDialog } from '@/components/CapsuleLikersDialog';
import { useToggleCapsuleLike } from '@/hooks/useCapsules';
import { formatLikesCountLabel } from '@/lib/capsuleLikes';
import { cn } from '@/lib/utils';

interface CapsuleLikeButtonProps {
  capsuleId: string;
  likesCount?: number;
  likedByMe?: boolean;
  className?: string;
  /** Permite abrir la lista aunque el viewer no pueda dar like (invitado). */
  allowOpenLikers?: boolean;
}

export function CapsuleLikeButton({
  capsuleId,
  likesCount = 0,
  likedByMe = false,
  className,
  allowOpenLikers = true,
}: CapsuleLikeButtonProps) {
  const toggle = useToggleCapsuleLike();
  const [pop, setPop] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [likersOpen, setLikersOpen] = useState(false);
  const canOpenLikers = allowOpenLikers && likesCount > 0;
  const countLabel = formatLikesCountLabel(likesCount);

  const handleToggle = () => {
    const nextLiked = !likedByMe;
    const nextCount = Math.max(0, likesCount + (nextLiked ? 1 : -1));
    if (nextLiked) {
      setPop(true);
      window.setTimeout(() => setPop(false), 200);
    }
    setAnnounce(
      nextLiked
        ? `Te gusta${nextCount > 0 ? `. ${nextCount}` : ''}`
        : `Quitaste el me gusta${nextCount > 0 ? `. Quedan ${nextCount}` : ''}`,
    );
    toggle.mutate({ capsuleId, liked: likedByMe });
  };

  return (
    <>
      <div className={cn('inline-flex items-stretch', className)}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggle.isPending}
          aria-pressed={likedByMe}
          aria-busy={toggle.isPending || undefined}
          aria-label={
            likedByMe
              ? `Quitar me gusta${likesCount > 0 ? ` (${likesCount})` : ''}`
              : `Me gusta${likesCount > 0 ? ` (${likesCount})` : ''}`
          }
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
            'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            canOpenLikers ? 'rounded-r-none' : null,
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
          {!canOpenLikers ? (
            <span className="tabular-nums" aria-hidden="true">
              {countLabel}
            </span>
          ) : null}
        </button>

        {canOpenLikers ? (
          <button
            type="button"
            onClick={() => setLikersOpen(true)}
            aria-label={`Ver quiénes dieron me gusta (${likesCount})`}
            className={cn(
              'inline-flex items-center rounded-lg rounded-l-none px-2 py-1.5 text-sm tabular-nums transition-colors',
              'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              likedByMe ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {likesCount}
          </button>
        ) : null}
      </div>

      <span className="sr-only" aria-live="polite">
        {announce}
      </span>

      {allowOpenLikers ? (
        <CapsuleLikersDialog
          open={likersOpen}
          capsuleId={capsuleId}
          likesCount={likesCount}
          onClose={() => setLikersOpen(false)}
        />
      ) : null}
    </>
  );
}
