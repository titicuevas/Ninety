import { isValidCapsuleMatchId } from './manualMatch.js';
import { fetchProfilesByIds } from './profileLookup.js';
import { excludeBlockedIds, listBlockedEitherWayIds } from './userBlocks.js';
import { getFollowingIds } from './userFollows.js';

export const ALSO_WATCHED_LIMIT = 50;
const FOLLOWING_SCAN_LIMIT = 500;

export type AlsoWatchedPerson = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  capsule_id: string;
};

/** Follows visibles (sin self ni bloqueos) para buscar Capsules del mismo partido. */
export function candidateAlsoWatchedIds(
  followingIds: string[] | null,
  blockedIds: ReadonlySet<string>,
  viewerId: string,
): string[] {
  if (!followingIds || followingIds.length === 0) return [];
  const withoutSelf = followingIds.filter((id) => id !== viewerId).slice(0, FOLLOWING_SCAN_LIMIT);
  return excludeBlockedIds(withoutSelf, blockedIds);
}

export function assembleAlsoWatchedPeople(
  capsules: Array<{ id: string; user_id: string }>,
  profiles: Array<{
    id: string;
    username: string | null;
    display_name?: string | null;
    full_name?: string | null;
    avatar_url: string | null;
  }>,
): AlsoWatchedPerson[] {
  const byId = new Map(
    profiles.map((profile) => [
      profile.id,
      {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name ?? profile.full_name ?? null,
        avatar_url: profile.avatar_url,
      },
    ]),
  );

  const seen = new Set<string>();
  const people: AlsoWatchedPerson[] = [];
  for (const capsule of capsules) {
    if (seen.has(capsule.user_id)) continue;
    seen.add(capsule.user_id);
    const profile = byId.get(capsule.user_id);
    if (!profile) continue;
    people.push({ ...profile, capsule_id: capsule.id });
  }

  return people.sort((a, b) =>
    (a.display_name ?? a.username ?? '').localeCompare(b.display_name ?? b.username ?? '', 'es'),
  );
}

/** Follows del usuario con Capsule pública del mismo partido. */
export async function listAlsoWatched(
  viewerId: string,
  matchId: number,
): Promise<AlsoWatchedPerson[]> {
  if (!isValidCapsuleMatchId(matchId)) {
    throw Object.assign(new Error('match_id inválido'), { status: 400 });
  }

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('También lo vieron no disponible'), { status: 503 });
  }

  const [followingIds, blockedList] = await Promise.all([
    getFollowingIds(supabaseAdmin, viewerId),
    listBlockedEitherWayIds(viewerId),
  ]);

  const candidateIds = candidateAlsoWatchedIds(
    followingIds,
    new Set(blockedList),
    viewerId,
  );
  if (candidateIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('capsules')
    .select('id, user_id')
    .eq('match_id', matchId)
    .eq('is_public', true)
    .in('user_id', candidateIds)
    .limit(ALSO_WATCHED_LIMIT);

  if (error) throw error;

  const capsules = (data ?? []) as Array<{ id: string; user_id: string }>;
  if (capsules.length === 0) return [];

  const profiles = await fetchProfilesByIds(
    supabaseAdmin,
    capsules.map((row) => row.user_id),
  );
  if (profiles.error) throw profiles.error;

  return assembleAlsoWatchedPeople(capsules, profiles.rows);
}
