import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { FollowButton } from '@/components/FollowButton';
import { PeopleListSkeleton } from '@/components/ListSkeletons';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/hooks/useAuthInit';
import { useCapsuleLikes } from '@/hooks/useCapsuleLikes';
import { formatLikesPanelTitle } from '@/lib/capsuleLikes';
import { formatRelativeTime } from '@/lib/format';
import { isAutoUsername } from '@/lib/profileHelpers';
import { publicProfilePath } from '@/lib/profilePath';
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
  const href = publicProfilePath(username);
  const canLink = !!href;
  const isSelf = !!currentUserId && like.user_id === currentUserId;
  const canFollow = canLink && !isSelf && !!currentUserId;

  return (
    <li className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
      {canLink ? (
        <Link to={href} className="shrink-0" aria-label={`Perfil de ${name}`}>
          <LikerAvatar name={name} avatarUrl={profile?.avatar_url} />
        </Link>
      ) : (
        <LikerAvatar name={name} avatarUrl={profile?.avatar_url} />
      )}

      <div className="min-w-0 flex-1 space-y-0.5">
        {canLink ? (
          <Link
            to={href}
            className="block truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
          >
            {name}
            {isSelf ? ' (tú)' : ''}
          </Link>
        ) : (
          <p className="truncate text-sm font-medium">
            {name}
            {isSelf ? ' (tú)' : ''}
          </p>
        )}
        {username && !isAutoUsername(username) ? (
          <p className="truncate text-xs text-muted-foreground">@{username}</p>
        ) : null}
        <p className="text-[11px] text-muted-foreground/90">{formatRelativeTime(like.created_at)}</p>
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

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
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
            className="border-0 py-10"
            title="Sin me gusta aún"
            description="Cuando alguien pulse el corazón, aparecerá aquí."
          />
        ) : null}

        {!isLoading && !isError && likes.length > 0 ? (
          <ul className="divide-y divide-border/70">
            {likes.map((like) => (
              <LikerRow key={`${like.user_id}-${like.created_at}`} like={like} currentUserId={user?.id} />
            ))}
          </ul>
        ) : null}

        {hasNextPage ? (
          <div className="pb-1 pt-3">
            <Button
              type="button"
              variant="secondary"
              className="w-full border-primary/20 hover:border-primary/40"
              loading={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              Ver más
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
