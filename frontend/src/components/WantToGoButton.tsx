import type { MouseEvent } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAddWantToGo, useRemoveWantToGo, useWantToGoIds } from '@/hooks/useWantToGo';
import { footballMatchToWantToGoInput, wantToGoButtonLabel } from '@/lib/wantToGo';
import { cn } from '@/lib/utils';
import type { FootballMatch } from '@/types/football';

type WantToGoButtonProps = {
  match: FootballMatch;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'secondary' | 'ghost';
  className?: string;
  /** Si se conoce de antemano (evita flicker). */
  saved?: boolean;
};

export function WantToGoButton({
  match,
  size = 'sm',
  variant = 'outline',
  className,
  saved: savedProp,
}: WantToGoButtonProps) {
  const idsQuery = useWantToGoIds();
  const add = useAddWantToGo();
  const remove = useRemoveWantToGo();

  const ids = new Set(idsQuery.data?.match_ids ?? []);
  const saved = savedProp ?? ids.has(match.id);
  const busy =
    (add.isPending && add.variables?.match_id === match.id) ||
    (remove.isPending && remove.variables === match.id);

  const onClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    if (saved) {
      remove.mutate(match.id);
      return;
    }
    add.mutate(footballMatchToWantToGoInput(match));
  };

  const label = wantToGoButtonLabel({ saved, busy });
  const Icon = saved ? BookmarkCheck : Bookmark;

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn(saved && 'border-primary/40 text-primary', className)}
      disabled={busy}
      aria-pressed={saved}
      aria-label={label}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="ml-1.5">{label}</span>
    </Button>
  );
}
