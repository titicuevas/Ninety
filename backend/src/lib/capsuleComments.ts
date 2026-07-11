import type { SupabaseClient } from '@supabase/supabase-js';

export interface CommentStats {
  comments_count: number;
}

export function isMissingCommentsTable(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);

  return (
    message.includes('capsule_comments') ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('Could not find')
  );
}

function defaultCommentStats<T extends { id: string }>(items: T[]): Array<T & CommentStats> {
  return items.map((item) => ({
    ...item,
    comments_count: 0,
  }));
}

export async function attachCommentCounts<T extends { id: string }>(
  supabase: SupabaseClient,
  items: T[],
): Promise<Array<T & CommentStats>> {
  const ids = items.map((item) => item.id);
  if (ids.length === 0) return [];

  const { data: comments, error } = await supabase
    .from('capsule_comments')
    .select('capsule_id')
    .in('capsule_id', ids);

  if (error) {
    if (isMissingCommentsTable(error)) {
      return defaultCommentStats(items);
    }
    throw error;
  }

  const countMap = new Map<string, number>();
  for (const row of comments ?? []) {
    countMap.set(row.capsule_id, (countMap.get(row.capsule_id) ?? 0) + 1);
  }

  return items.map((item) => ({
    ...item,
    comments_count: countMap.get(item.id) ?? 0,
  }));
}

export interface CommentRow {
  id: string;
  capsule_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface CommentAuthor {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export async function fetchCommentsWithAuthors(
  supabase: SupabaseClient,
  capsuleId: string,
): Promise<Array<CommentRow & { author: CommentAuthor | null }>> {
  const { data: comments, error } = await supabase
    .from('capsule_comments')
    .select('id, capsule_id, user_id, body, created_at')
    .eq('capsule_id', capsuleId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = comments ?? [];
  const userIds = [...new Set(rows.map((c) => c.user_id))];
  const profileMap = new Map<string, CommentAuthor>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        username: profile.username,
        display_name: profile.full_name ?? null,
        avatar_url: profile.avatar_url,
      });
    }
  }

  return rows.map((comment) => ({
    ...comment,
    author: profileMap.get(comment.user_id) ?? null,
  }));
}
