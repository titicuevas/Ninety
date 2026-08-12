import { apiFetch } from '@/lib/api';
import { isAutoUsername } from '@/lib/profileHelpers';
import { siteUrl } from '@/lib/siteUrl';

const INVITE_CODE_KEY = 'ninety.inviteCode:v1';

/** Normaliza un código de invitación (username). Rechaza auto-usernames y basura. */
export function normalizeInviteCode(value: string | null | undefined): string | null {
  if (value == null) return null;
  const code = value.trim().toLowerCase();
  if (!code || code.length < 3 || code.length > 30) return null;
  if (!/^[a-z0-9_]+$/.test(code)) return null;
  if (isAutoUsername(code)) return null;
  return code;
}

/** Deep link absoluto para compartir. */
export function inviteUrl(username: string): string {
  const code = normalizeInviteCode(username);
  if (!code) return siteUrl();
  return `${siteUrl()}/invite/${encodeURIComponent(code)}`;
}

export function invitePath(username: string): string {
  const code = normalizeInviteCode(username);
  if (!code) return '/';
  return `/invite/${encodeURIComponent(code)}`;
}

/** Lee `?ref=` de un search string. */
export function parseRefParam(search: string | URLSearchParams): string | null {
  const params =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      : search;
  return normalizeInviteCode(params.get('ref'));
}

export function saveInviteCode(code: string | null | undefined): void {
  const normalized = normalizeInviteCode(code);
  if (!normalized) {
    try {
      sessionStorage.removeItem(INVITE_CODE_KEY);
    } catch {
      // ignore
    }
    return;
  }
  try {
    sessionStorage.setItem(INVITE_CODE_KEY, normalized);
  } catch {
    // ignore
  }
}

export function peekInviteCode(): string | null {
  try {
    return normalizeInviteCode(sessionStorage.getItem(INVITE_CODE_KEY));
  } catch {
    return null;
  }
}

export function consumeInviteCode(): string | null {
  const code = peekInviteCode();
  try {
    sessionStorage.removeItem(INVITE_CODE_KEY);
  } catch {
    // ignore
  }
  return code;
}

/**
 * Intenta atribuir el invite pendiente tras auth.
 * Best-effort: consume el código aunque falle (evita reintentos infinitos).
 */
export async function claimPendingInvite(accessToken: string | null | undefined): Promise<boolean> {
  const code = consumeInviteCode();
  if (!code || !accessToken) return false;

  try {
    await apiFetch(
      '/api/invites/claim',
      { method: 'POST', body: JSON.stringify({ code }) },
      accessToken,
    );
    return true;
  } catch {
    return false;
  }
}
