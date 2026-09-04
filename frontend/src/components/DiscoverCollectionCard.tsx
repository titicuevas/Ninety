import { Link } from 'react-router-dom';
import { Library } from 'lucide-react';
import { CollectionCardSocialFooter } from '@/components/CollectionCardSocialFooter';
import { FollowButton } from '@/components/FollowButton';
import { FollowsYouBadge } from '@/components/FollowsYouBadge';
import { formatCollectionCardMeta } from '@/lib/collectionCardMeta';
import { discoverCollectionMatchLabel } from '@/lib/discoverCollections';
import { profilePath } from '@/lib/profilePath';
import type { DiscoverCollection } from '@/types/collection';

export function DiscoverCollectionCard({
  collection,
  currentUserId,
}: {
  collection: DiscoverCollection;
  currentUserId?: string;
}) {
  const author = collection.author;
  const username = author.username;
  const authorName = author.display_name ?? username ?? 'Aficionado';
  const matchLabel = discoverCollectionMatchLabel(collection.match_reason);
  const collectionHref =
    username && collection.slug
      ? `/u/${encodeURIComponent(username)}/lists/${encodeURIComponent(collection.slug)}`
      : null;

  return (
    <li>
      <article className="motion-card rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
        <div className="flex items-start gap-3">
          {collection.cover_url ? (
            <img
              src={collection.cover_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
              aria-hidden
            >
              <Library className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {collectionHref ? (
              <Link
                to={collectionHref}
                className="font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {collection.name}
              </Link>
            ) : (
              <p className="font-medium">{collection.name}</p>
            )}
            {collection.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {collection.description}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              {formatCollectionCardMeta(
                collection.items_count ?? 0,
                collection.likes_count ?? 0,
                collection.comments_count ?? 0,
              )}
            </p>
            <CollectionCardSocialFooter
              className="mt-2 space-y-1"
              collectionId={collection.id}
              ownerId={collection.user_id}
              currentUserId={currentUserId}
              likesCount={collection.likes_count}
              commentsCount={collection.comments_count}
              alsoLiked={collection.also_liked}
              alsoCommented={collection.also_commented}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
              {author.avatar_url ? (
                <img
                  src={author.avatar_url}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full border border-border object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {authorName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {username ? (
                    <Link
                      to={profilePath(username)}
                      className="text-sm font-medium hover:text-primary hover:underline"
                    >
                      {authorName}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">{authorName}</span>
                  )}
                  {matchLabel ? (
                    <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {matchLabel}
                    </span>
                  ) : null}
                  {author.follows_me ? <FollowsYouBadge /> : null}
                </div>
                {username ? (
                  <p className="text-xs text-muted-foreground">@{username}</p>
                ) : null}
              </div>
              {username ? (
                <FollowButton
                  username={username}
                  followedByMe={author.followed_by_me ?? false}
                  followsMe={author.follows_me ?? false}
                  size="compact"
                />
              ) : null}
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}
