import type { SupabaseClient } from '@supabase/supabase-js';
import { canEngageCollectionLikes } from './collectionLikes.js';

export interface CollectionCommentAuthor {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface CollectionCommentRow {
  id: string;
  collection_id: string;
  user_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  parent_id: string | null;
}

export type CollectionCommentWithAuthor = CollectionCommentRow & {
  author: CollectionCommentAuthor | null;
};

export function isMissingCollectionCommentsTable(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);

  return (
    message.includes('collection_comments') ||
    (message.includes('schema cache') && message.includes('collection_comment')) ||
    (message.includes('Could not find') && message.includes('collection_comment')) ||
    (message.includes('does not exist') && message.includes('collection_comment'))
  );
}

export function isMissingCollectionCommentParentId(error: unknown): boolean {
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

export function collectionCommentsMigrationHint(): string {
  return 'Ejecuta la migración 20250825120000_collection_comments.sql en Supabase.';
}

export function collectionCommentRepliesMigrationHint(): string {
  return 'Ejecuta la migración 20250828120000_collection_comment_replies.sql en Supabase.';
}

export function canEngageCollectionComments(
  collection: { user_id: string; is_public: boolean },
  viewerId: string | undefined,
): boolean {
  return canEngageCollectionLikes(collection, viewerId);
}

/**
 * Valida parent_id para hilos de 1 nivel: debe existir en la misma colección
 * y ser un comentario raíz (sin abuelo).
 */
export function assertValidCollectionReplyParent(
  parent: { id: string; collection_id: string; parent_id: string | null } | null | undefined,
  collectionId: string,
): string | null {
  if (!parent) return 'Comentario padre no encontrado';
  if (parent.collection_id !== collectionId) {
    return 'El comentario padre no pertenece a esta colección';
  }
  if (parent.parent_id != null) return 'Solo se permite un nivel de respuestas';
  return null;
}

const COMMENT_SELECT_FULL =
  'id, collection_id, user_id, body, created_at, edited_at, parent_id';
const COMMENT_SELECT_WITH_EDITED = 'id, collection_id, user_id, body, created_at, edited_at';
const COMMENT_SELECT_LEGACY = 'id, collection_id, user_id, body, created_at';

function isMissingEditedAt(error: unknown): boolean {
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

export async function fetchCollectionCommentsWithAuthors(
  supabase: SupabaseClient,
  collectionId: string,
): Promise<CollectionCommentWithAuthor[]> {
  let rows: Array<{
    id: string;
    collection_id: string;
    user_id: string;
    body: string;
    created_at: string;
    edited_at?: string | null;
    parent_id?: string | null;
  }> = [];

  const withFull = await supabase
    .from('collection_comments')
    .select(COMMENT_SELECT_FULL)
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: true });

  if (withFull.error) {
    if (isMissingCollectionCommentParentId(withFull.error)) {
      const withEdited = await supabase
        .from('collection_comments')
        .select(COMMENT_SELECT_WITH_EDITED)
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: true });
      if (withEdited.error) {
        if (isMissingEditedAt(withEdited.error)) {
          const legacy = await supabase
            .from('collection_comments')
            .select(COMMENT_SELECT_LEGACY)
            .eq('collection_id', collectionId)
            .order('created_at', { ascending: true });
          if (legacy.error) throw legacy.error;
          rows = legacy.data ?? [];
        } else {
          throw withEdited.error;
        }
      } else {
        rows = withEdited.data ?? [];
      }
    } else if (isMissingEditedAt(withFull.error)) {
      const legacy = await supabase
        .from('collection_comments')
        .select(COMMENT_SELECT_LEGACY)
        .eq('collection_id', collectionId)
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
  const profileMap = new Map<string, CollectionCommentAuthor>();

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
    collection_id: comment.collection_id,
    user_id: comment.user_id,
    body: comment.body,
    created_at: comment.created_at,
    edited_at: comment.edited_at ?? null,
    parent_id: comment.parent_id ?? null,
    author: profileMap.get(comment.user_id) ?? null,
  }));
}
