/** Máx. menciones únicas notificadas por comentario. */
export const MAX_MENTIONS_PER_COMMENT = 5;

const AUTO_USERNAME = /^user_[a-f0-9]{8}$/i;
const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

/**
 * @usuario no precedido de carácter de palabra (evita emails tipo a@b.com).
 * Captura username 3–30 [a-zA-Z0-9_].
 */
const MENTION_IN_TEXT_RE = /(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,30})\b/g;

function isAutoUsernameLocal(username: string): boolean {
  return !username || AUTO_USERNAME.test(username);
}

/** Extrae usernames únicos (lowercase), en orden de aparición, hasta `max`. */
export function extractMentionUsernames(
  body: string,
  max: number = MAX_MENTIONS_PER_COMMENT,
): string[] {
  if (!body || max <= 0) return [];

  const seen = new Set<string>();
  const result: string[] = [];
  const re = new RegExp(MENTION_IN_TEXT_RE.source, 'g');

  for (const match of body.matchAll(re)) {
    const raw = match[2];
    if (!raw) continue;
    const username = raw.toLowerCase();
    if (seen.has(username)) continue;
    if (!USERNAME_RE.test(username)) continue;
    if (isAutoUsernameLocal(username)) continue;
    seen.add(username);
    result.push(username);
    if (result.length >= max) break;
  }

  return result;
}

/**
 * Notifica a usuarios mencionados en un comentario.
 * No notifica: self, dueño de la Capsule (ya recibe type=comment), inválidos / inexistentes.
 * Blocks / mutes / prefs se aplican dentro de notifyUser.
 */
export async function notifyCommentMentions(params: {
  body: string;
  actorId: string;
  capsuleId: string;
  capsuleOwnerId: string;
  /** Ids adicionales a no notificar (p.ej. autor del comentario padre en una reply). */
  extraSkipIds?: string[];
}): Promise<void> {
  const usernames = extractMentionUsernames(params.body);
  if (usernames.length === 0) return;

  try {
    const [{ supabaseAdmin }, { notifyUser }] = await Promise.all([
      import('./supabase.js'),
      import('./notifyUser.js'),
    ]);
    if (!supabaseAdmin) return;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .in('username', usernames);

    if (error || !data?.length) return;

    const skip = new Set<string>([params.actorId, params.capsuleOwnerId, ...(params.extraSkipIds ?? [])]);
    const notified = new Set<string>();

    // Respetar orden de aparición en el comentario.
    const byUsername = new Map<string, { id: string; username: string }>();
    for (const row of data) {
      if (!row?.id || !row.username) continue;
      byUsername.set(String(row.username).toLowerCase(), {
        id: row.id,
        username: row.username,
      });
    }

    for (const username of usernames) {
      const profile = byUsername.get(username);
      if (!profile) continue;
      if (skip.has(profile.id) || notified.has(profile.id)) continue;
      notified.add(profile.id);
      void notifyUser({
        userId: profile.id,
        actorId: params.actorId,
        type: 'mention',
        capsuleId: params.capsuleId,
        body: params.body,
      });
    }
  } catch {
    // Non-critical — no romper el flujo del comentario.
  }
}
