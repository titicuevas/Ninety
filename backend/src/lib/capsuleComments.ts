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

export function isMissingParentIdColumn(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);

  return (
    message.includes('parent_id') &&
    (message.includes('schema cache') ||
      message.includes('Could not find') ||
      message.includes('column') ||
      message.includes('does not exist'))
  );
}

export function isMissingEditedAtColumn(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);

  return (
    message.includes('edited_at') &&
    (message.includes('schema cache') ||
      message.includes('Could not find') ||
      message.includes('column') ||
      message.includes('does not exist'))
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
  parent_id: string | null;
  edited_at: string | null;
}

export interface CommentAuthor {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export type CommentWithAuthor = CommentRow & { author: CommentAuthor | null };

const COMMENT_SELECT_FULL =
  'id, capsule_id, user_id, body, created_at, parent_id, edited_at';
const COMMENT_SELECT_WITH_PARENT = 'id, capsule_id, user_id, body, created_at, parent_id';
const COMMENT_SELECT_LEGACY = 'id, capsule_id, user_id, body, created_at';

/**
 * Valida parent_id para hilos de 1 nivel: debe existir en la misma cápsula
 * y ser un comentario raíz (sin abuelo).
 */
export function assertValidReplyParent(
  parent: { id: string; capsule_id: string; parent_id: string | null } | null | undefined,
  capsuleId: string,
): string | null {
  if (!parent) return 'Comentario padre no encontrado';
  if (parent.capsule_id !== capsuleId) return 'El comentario padre no pertenece a esta Capsule';
  if (parent.parent_id != null) return 'Solo se permite un nivel de respuestas';
  return null;
}

export async function fetchCommentsWithAuthors(
  supabase: SupabaseClient,
  capsuleId: string,
): Promise<CommentWithAuthor[]> {
  let rows: Array<{
    id: string;
    capsule_id: string;
    user_id: string;
    body: string;
    created_at: string;
    parent_id?: string | null;
    edited_at?: string | null;
  }> = [];

  const withFull = await supabase
    .from('capsule_comments')
    .select(COMMENT_SELECT_FULL)
    .eq('capsule_id', capsuleId)
    .order('created_at', { ascending: true });

  if (withFull.error) {
    if (isMissingEditedAtColumn(withFull.error)) {
      const withParent = await supabase
        .from('capsule_comments')
        .select(COMMENT_SELECT_WITH_PARENT)
        .eq('capsule_id', capsuleId)
        .order('created_at', { ascending: true });

      if (withParent.error) {
        if (isMissingParentIdColumn(withParent.error)) {
          const legacy = await supabase
            .from('capsule_comments')
            .select(COMMENT_SELECT_LEGACY)
            .eq('capsule_id', capsuleId)
            .order('created_at', { ascending: true });
          if (legacy.error) throw legacy.error;
          rows = legacy.data ?? [];
        } else {
          throw withParent.error;
        }
      } else {
        rows = withParent.data ?? [];
      }
    } else if (isMissingParentIdColumn(withFull.error)) {
      const legacy = await supabase
        .from('capsule_comments')
        .select(COMMENT_SELECT_LEGACY)
        .eq('capsule_id', capsuleId)
        .order('created_at', { ascending: true });
      if (legacy.error) throw legacy.error;
      rows = legacy.data ?? [];
    } else {
      throw withFull.error;
    }
  } else {
    rows = withFull.data ?? [];
  }

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
    id: comment.id,
    capsule_id: comment.capsule_id,
    user_id: comment.user_id,
    body: comment.body,
    created_at: comment.created_at,
    parent_id: comment.parent_id ?? null,
    edited_at: comment.edited_at ?? null,
    author: profileMap.get(comment.user_id) ?? null,
  }));
}
