export interface CapsuleComment {
  id: string;
  capsule_id: string;
  user_id: string;
  body: string;
  created_at: string;
  /** null = comentario raíz; uuid = respuesta (máx. 1 nivel). */
  parent_id: string | null;
  author: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CapsuleCommentsResponse {
  comments: CapsuleComment[];
}

export interface CommentThread {
  root: CapsuleComment;
  replies: CapsuleComment[];
}

/** Agrupa lista plana en hilos de 1 nivel (respuestas a raíces). */
export function buildCommentThreads(comments: CapsuleComment[]): CommentThread[] {
  const roots: CapsuleComment[] = [];
  const repliesByParent = new Map<string, CapsuleComment[]>();

  for (const comment of comments) {
    const parentId = comment.parent_id ?? null;
    if (!parentId) {
      roots.push(comment);
      continue;
    }
    const list = repliesByParent.get(parentId) ?? [];
    list.push(comment);
    repliesByParent.set(parentId, list);
  }

  const rootIds = new Set(roots.map((r) => r.id));
  // Huérfanas (padre borrado / inválido): promover a raíz para no perderlas.
  for (const [parentId, replies] of repliesByParent) {
    if (!rootIds.has(parentId)) {
      for (const reply of replies) {
        roots.push({ ...reply, parent_id: null });
      }
      repliesByParent.delete(parentId);
    }
  }

  roots.sort((a, b) => a.created_at.localeCompare(b.created_at));

  return roots.map((root) => ({
    root,
    replies: (repliesByParent.get(root.id) ?? []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }));
}
