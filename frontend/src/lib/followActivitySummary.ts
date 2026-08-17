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
