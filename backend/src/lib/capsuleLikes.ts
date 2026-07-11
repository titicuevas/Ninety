import type { SupabaseClient } from '@supabase/supabase-js';

export interface LikeStats {
  likes_count: number;
  liked_by_me: boolean;
}

export function isMissingLikesTable(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);

  return (
    message.includes('capsule_likes') ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('Could not find')
  );
}

function defaultLikeStats<T extends { id: string }>(items: T[]): Array<T & LikeStats> {
  return items.map((item) => ({
    ...item,
    likes_count: 0,
    liked_by_me: false,
  }));
}

export async function attachLikeStats<T extends { id: string }>(
  supabase: SupabaseClient,
  userId: string,
  items: T[],
): Promise<Array<T & LikeStats>> {
  const ids = items.map((item) => item.id);
  if (ids.length === 0) return [];

  const { data: likes, error } = await supabase
    .from('capsule_likes')
    .select('capsule_id, user_id')
    .in('capsule_id', ids);

  if (error) {
    if (isMissingLikesTable(error)) {
      return defaultLikeStats(items);
    }
    throw error;
  }

  const countMap = new Map<string, number>();
  const likedByMe = new Set<string>();

  for (const like of likes ?? []) {
    countMap.set(like.capsule_id, (countMap.get(like.capsule_id) ?? 0) + 1);
    if (like.user_id === userId) {
      likedByMe.add(like.capsule_id);
    }
  }

  return items.map((item) => ({
    ...item,
    likes_count: countMap.get(item.id) ?? 0,
    liked_by_me: likedByMe.has(item.id),
  }));
}
