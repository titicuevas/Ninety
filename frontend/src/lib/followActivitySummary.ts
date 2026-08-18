import { formatEngagementMeta } from './collectionCardMeta.ts';
import { pickEngagedPreview } from './pickEngagedPreview.ts';
import type { AlsoWatchedPerson } from '@/lib/capsuleAlsoWatched';
import type { CollectionAlsoLikedPerson } from '@/lib/collectionAlsoLiked';
import type { FollowActivityEvent } from '@/types/activity';

export type ActivityEventSummary = {
  action: string;
  href: string;
  label: string;
};

/** Texto y enlace principal de un evento de actividad (feed / home preview). */
export function summarizeFollowActivityEvent(event: FollowActivityEvent): ActivityEventSummary {
  if (
    event.type === 'capsule' ||
    event.type === 'capsule_like' ||
    event.type === 'capsule_comment'
  ) {
    const label = `${event.capsule.home_team_name} vs ${event.capsule.away_team_name}`;
    const href =
      event.type === 'capsule_comment'
        ? `/c/${event.capsule.id}#comments`
        : `/c/${event.capsule.id}`;
    const action =
      event.type === 'capsule_comment'
        ? 'comentó en'
        : event.type === 'capsule_like'
          ? 'le gustó'
          : 'publicó';
    return { action, href, label };
  }

  const username = event.collection.author_username ?? event.actor.username;
  const href =
    username && event.collection.slug
      ? `/u/${encodeURIComponent(username)}/lists/${encodeURIComponent(event.collection.slug)}`
      : '/activity';
  const action =
    event.type === 'collection_comment'
      ? 'comentó en'
      : event.type === 'collection_like'
        ? 'le gustó'
        : 'creó';
  return { action, href, label: event.collection.name };
}

/** Recuento de likes/comentarios del objetivo (Capsule o lista). */
export function followActivityEngagementMeta(event: FollowActivityEvent): string {
  if (
    event.type === 'capsule' ||
    event.type === 'capsule_like' ||
    event.type === 'capsule_comment'
  ) {
    return formatEngagementMeta(event.capsule.likes_count ?? 0, event.capsule.comments_count ?? 0);
  }
  return formatEngagementMeta(
    event.collection.likes_count ?? 0,
    event.collection.comments_count ?? 0,
  );
}

/** Follows que vieron el mismo partido (eventos de Capsule). */
export function followActivityAlsoWatched(
  event: FollowActivityEvent,
): AlsoWatchedPerson[] {
  if (
    event.type === 'capsule' ||
    event.type === 'capsule_like' ||
    event.type === 'capsule_comment'
  ) {
    return event.capsule.also_watched ?? [];
  }
  return [];
}

/** Follows que dieron me gusta (undefined = la API aún no envía el campo). */
export function followActivityAlsoLiked(
  event: FollowActivityEvent,
): CollectionAlsoLikedPerson[] | undefined {
  if (
    event.type === 'capsule' ||
    event.type === 'capsule_like' ||
    event.type === 'capsule_comment'
  ) {
    return event.capsule.also_liked;
  }
  return event.collection.also_liked;
}

export function followActivityAlsoCommented(
  event: FollowActivityEvent,
): CollectionAlsoLikedPerson[] | undefined {
  if (
    event.type === 'capsule' ||
    event.type === 'capsule_like' ||
    event.type === 'capsule_comment'
  ) {
    return event.capsule.also_commented;
  }
  return event.collection.also_commented;
}

/** Preview de Home: mezcla likes/comentarios y «también lo vieron». */
export function pickEngagedActivityPreview(
  events: FollowActivityEvent[],
  limit: number,
): FollowActivityEvent[] {
  return pickEngagedPreview(
    events.map((event) => {
      if (
        event.type === 'capsule' ||
        event.type === 'capsule_like' ||
        event.type === 'capsule_comment'
      ) {
        return {
          event,
          id: event.id,
          likes_count: event.capsule.likes_count,
          comments_count: event.capsule.comments_count,
          also_watched: event.capsule.also_watched,
          also_liked: event.capsule.also_liked,
          also_commented: event.capsule.also_commented,
        };
      }
      return {
        event,
        id: event.id,
        likes_count: event.collection.likes_count,
        comments_count: event.collection.comments_count,
        also_liked: event.collection.also_liked,
        also_commented: event.collection.also_commented,
      };
    }),
    limit,
  ).map((row) => row.event);
}
