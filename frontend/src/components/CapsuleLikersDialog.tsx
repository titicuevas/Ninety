import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { FollowButton } from '@/components/FollowButton';
import { PeopleListSkeleton } from '@/components/ListSkeletons';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import { useCapsuleLikes } from '@/hooks/useCapsuleLikes';
import { formatLikesPanelTitle } from '@/lib/capsuleLikes';
import { formatRelativeTime } from '@/lib/format';
import { isAutoUsername } from '@/lib/profileHelpers';
import { profilePath } from '@/lib/profilePath';
import { cn } from '@/lib/utils';
import type { CapsuleLikeRow } from '@/types/like';

function LikerAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null | undefined }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function LikerRow({
  like,
  currentUserId,
}: {
  like: CapsuleLikeRow;
  currentUserId?: string;
}) {
  const profile = like.profile;
  const name = profile?.display_name || profile?.username || 'Aficionado';
  const username = profile?.username;
  const canLink = !!username && !isAutoUsername(username);
  const isSelf = !!currentUserId && like.user_id === currentUserId;
  const canFollow = canLink && !isSelf && !!currentUserId;

  return (
    <li className="flex items-center gap-3 py-2.5">
      {canLink ? (
        <Link to={profilePath(username!)} className="shrink-0" aria-label={`Perfil de ${name}`}>
          <LikerAvatar name={name} avatarUrl={profile?.avatar_url} />
        </Link>
      ) : (
        <LikerAvatar name={name} avatarUrl={profile?.avatar_url} />
      )}

      <div className="min-w-0 flex-1">
        {canLink ? (
          <Link
            to={profilePath(username!)}
            className="block truncate font-medium text-foreground hover:text-primary hover:underline"
          >
            {name}
            {isSelf ? ' (tú)' : ''}
          </Link>
        ) : (
          <p className="truncate font-medium">
            {name}
            {isSelf ? ' (tú)' : ''}
          </p>
        )}
        {username && !isAutoUsername(username) ? (
          <p className="truncate text-sm text-muted-foreground">@{username}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">{formatRelativeTime(like.created_at)}</p>
      </div>

      {canFollow && username ? (
        <FollowButton username={username} followedByMe={!!profile?.followed_by_me} size="compact" />
      ) : null}
    </li>
  );
}

type CapsuleLikersDialogProps = {
  open: boolean;
  capsuleId: string;
  likesCount?: number;
  onClose: () => void;
};

export function CapsuleLikersDialog({
  open,
  capsuleId,
  likesCount = 0,
  onClose,
}: CapsuleLikersDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { user } = useAuth();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useCapsuleLikes(capsuleId, open);

  const likes = data?.pages.flatMap((page) => page.likes) ?? [];
  const total = data?.pages[0]?.total ?? likesCount;
  const title = formatLikesPanelTitle(total);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onNativeClose = () => {
      onClose();
    };
    dialog.addEventListener('close', onNativeClose);
    return () => dialog.removeEventListener('close', onNativeClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cn(
        'fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4 text-card-foreground',
        'backdrop:bg-black/60 open:flex',
      )}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div
        className="flex max-h-[min(85dvh,32rem)] w-[min(100%,24rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2 id={titleId} className="text-base font-semibold tracking-tight">
            {title}
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 sm:px-5">
          {isLoading ? <PeopleListSkeleton count={4} label="Cargando me gusta" /> : null}

          {isError ? (
            <QueryErrorCard
              className="my-3"
              message={error instanceof Error ? error.message : 'No se pudieron cargar los me gusta'}
              loading={isRefetching}
              onRetry={() => void refetch()}
            />
          ) : null}

          {!isLoading && !isError && likes.length === 0 ? (
            <EmptyState
              icon={Heart}
              className="border-0 py-8"
              title="Sin me gusta aún"
              description="Cuando alguien pulse el corazón, aparecerá aquí."
            />
          ) : null}

          {!isLoading && !isError && likes.length > 0 ? (
            <ul className="divide-y divide-border">
              {likes.map((like) => (
                <LikerRow key={`${like.user_id}-${like.created_at}`} like={like} currentUserId={user?.id} />
              ))}
            </ul>
          ) : null}

          {hasNextPage ? (
            <div className="py-3">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                loading={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                Ver más
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
