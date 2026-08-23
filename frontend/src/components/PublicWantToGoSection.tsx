import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { capsuleCardListClass } from '@/components/CapsuleListCard';
import { MatchCard } from '@/components/MatchCard';
import { WantToGoButton } from '@/components/WantToGoButton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import { usePublicWantToGo } from '@/hooks/useWantToGo';
import { profilePath } from '@/lib/profilePath';
import { wantToGoToFootballMatch } from '@/lib/wantToGo';
import type { PublicWantToGoItem } from '@/types/wantToGo';

const PUBLIC_WANT_TO_GO_PREVIEW = 6;

function PublicWantToGoRow({
  item,
  canSave,
}: {
  item: PublicWantToGoItem;
  canSave: boolean;
}) {
  const match = wantToGoToFootballMatch(item);

  return (
    <li className="space-y-2">
      <MatchCard match={match} wantToGo />
      {canSave ? <WantToGoButton match={match} /> : null}
    </li>
  );
}

export function PublicWantToGoSection({
  username,
  isOwnProfile,
  isBlockedByMe,
}: {
  username?: string | null;
  isOwnProfile: boolean;
  isBlockedByMe: boolean;
}) {
  const { user } = useAuth();
  const { data, isError } = usePublicWantToGo(username ?? undefined, PUBLIC_WANT_TO_GO_PREVIEW);

  if (isBlockedByMe || isError || !username) return null;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const href = `${profilePath(username)}/want-to-go`;

  if (items.length === 0) {
    if (!isOwnProfile) return null;
    return (
      <section className="space-y-3" aria-labelledby="public-want-to-go-heading">
        <h2
          id="public-want-to-go-heading"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <Bookmark className="h-5 w-5 text-primary" aria-hidden />
          Quiero ir
        </h2>
        <Button asChild variant="secondary" size="sm">
          <Link to="/want-to-go">Añade partidos a Quiero ir</Link>
        </Button>
      </section>
    );
  }

  return (
    <section
      className="space-y-3"
      aria-labelledby="public-want-to-go-heading"
      data-testid="public-want-to-go"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2
          id="public-want-to-go-heading"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <Bookmark className="h-5 w-5 text-primary" aria-hidden />
          Quiero ir
        </h2>
        {total > items.length ? (
          <Link to={href} className="text-sm text-primary hover:underline">
            Ver todos ({total})
          </Link>
        ) : (
          <Link to={href} className="text-sm text-primary hover:underline">
            Ver lista
          </Link>
        )}
      </div>
      <ul className={capsuleCardListClass}>
        {items.map((item) => (
          <PublicWantToGoRow key={item.match_id} item={item} canSave={!!user} />
        ))}
      </ul>
    </section>
  );
}
