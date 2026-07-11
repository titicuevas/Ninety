import { Heart } from 'lucide-react';
import { useToggleCapsuleLike } from '@/hooks/useCapsules';
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

  return (
    <button
      type="button"
      onClick={() => toggle.mutate({ capsuleId, liked: likedByMe })}
      disabled={toggle.isPending}
      aria-pressed={likedByMe}
      aria-label={likedByMe ? 'Quitar me gusta' : 'Me gusta'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
        'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        likedByMe ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      <Heart
        className={cn('h-4 w-4 shrink-0 transition-colors', likedByMe && 'fill-primary text-primary')}
        aria-hidden="true"
      />
      <span className="tabular-nums">{likesCount > 0 ? likesCount : 'Me gusta'}</span>
    </button>
  );
}
