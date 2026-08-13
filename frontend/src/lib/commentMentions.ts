import { isAutoUsername } from '@/lib/profileHelpers';

/** Máx. menciones únicas parseadas (espejo backend). */
export const MAX_MENTIONS_PER_COMMENT = 5;

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;
const MENTION_IN_TEXT_RE = /(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,30})\b/g;

export type CommentBodyPart =
  | { type: 'text'; value: string; start: number }
  | { type: 'mention'; username: string; raw: string; start: number };

/** Extrae usernames únicos (lowercase) hasta `max`. */
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
    if (isAutoUsername(username)) continue;
    seen.add(username);
    result.push(username);
    if (result.length >= max) break;
  }

  return result;
}

/** Parte el cuerpo en texto plano y menciones enlazables. */
export function splitCommentMentions(body: string): CommentBodyPart[] {
  if (!body) return [{ type: 'text', value: '', start: 0 }];

  const parts: CommentBodyPart[] = [];
  const re = new RegExp(MENTION_IN_TEXT_RE.source, 'g');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(body)) !== null) {
    const prefix = match[1] ?? '';
    const raw = match[2] ?? '';
    const username = raw.toLowerCase();
    const atIndex = match.index + prefix.length;

    if (atIndex > lastIndex) {
      parts.push({ type: 'text', value: body.slice(lastIndex, atIndex), start: lastIndex });
    }

    if (USERNAME_RE.test(username) && !isAutoUsername(username)) {
      parts.push({ type: 'mention', username, raw, start: atIndex });
    } else {
      parts.push({ type: 'text', value: `@${raw}`, start: atIndex });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < body.length) {
    parts.push({ type: 'text', value: body.slice(lastIndex), start: lastIndex });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: body, start: 0 }];
}
