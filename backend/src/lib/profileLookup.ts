import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeUsernameParam } from './usernameParam.js';

/** Columnas públicas compatibles con esquemas sin `bio` / `display_name`. */
export const PROFILE_PUBLIC_SELECT_CORE =
  'id, username, full_name, avatar_url, favorite_team, country, city, created_at';

/** Preferido cuando la migración profiles_align (bio) está aplicada. */
export const PROFILE_PUBLIC_SELECT_WITH_BIO = `${PROFILE_PUBLIC_SELECT_CORE.replace(
  ', created_at',
  ', bio, created_at',
)}`;

type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
} | null;

/** PostgREST / Postgres: columna inexistente (p. ej. bio aún no migrada). */
export function isMissingProfileColumn(
  error: PostgrestLikeError | undefined,
  column?: string,
): boolean {
  if (!error) return false;
  const message = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  const isMissing =
    error.code === '42703' ||
    message.includes('does not exist') ||
    message.includes('schema cache');
  if (!isMissing) return false;
  if (!column) return true;
  if (message.includes(column.toLowerCase())) return true;
  // Errores genéricos de schema cache no nombran la columna.
  if (message.includes('schema cache')) return true;
  return false;
}

export function profilesAlignMigrationHint() {
  return 'Esquema de perfiles desactualizado. Ejecuta supabase/migrations/20250705140000_profiles_align.sql (columna bio).';
}

export type PublicProfileRow = {
  id: string;
  username: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url: string | null;
  favorite_team: string | null;
  country: string | null;
  city: string | null;
  bio?: string | null;
  created_at: string;
};

/**
 * Carga perfil por username (case-insensitive vía normalize).
 * Si falta `bio` en la BD, reintenta sin esa columna (evita 404 falso).
 */
export async function fetchProfileByUsername(
  client: SupabaseClient,
  username: string | string[] | undefined,
  options: { columns?: string } = {},
): Promise<
  | { profile: PublicProfileRow; error: null }
  | { profile: null; error: 'not_found' | 'schema' | 'query'; message?: string }
> {
  const normalized = normalizeUsernameParam(username);
  if (!normalized) {
    return { profile: null, error: 'not_found' };
  }

  const preferred = options.columns ?? PROFILE_PUBLIC_SELECT_WITH_BIO;
  const first = await client.from('profiles').select(preferred).eq('username', normalized).maybeSingle();

  if (!first.error && first.data) {
    return { profile: first.data as unknown as PublicProfileRow, error: null };
  }

  if (first.error && isMissingProfileColumn(first.error, 'bio') && preferred.includes('bio')) {
    const fallback = await client
      .from('profiles')
      .select(PROFILE_PUBLIC_SELECT_CORE)
      .eq('username', normalized)
      .maybeSingle();

    if (!fallback.error && fallback.data) {
      return {
        profile: { ...(fallback.data as unknown as PublicProfileRow), bio: null },
        error: null,
      };
    }

    if (!fallback.error && !fallback.data) {
      return { profile: null, error: 'not_found' };
    }

    if (fallback.error && isMissingProfileColumn(fallback.error)) {
      return {
        profile: null,
        error: 'schema',
        message: profilesAlignMigrationHint(),
      };
    }

    return {
      profile: null,
      error: 'query',
      message: fallback.error?.message ?? first.error.message,
    };
  }

  if (!first.error && !first.data) {
    return { profile: null, error: 'not_found' };
  }

  if (first.error && isMissingProfileColumn(first.error)) {
    return {
      profile: null,
      error: 'schema',
      message: profilesAlignMigrationHint(),
    };
  }

  // PGRST116 = 0 rows con .single(); maybeSingle suele no devolver error
  if (first.error?.code === 'PGRST116') {
    return { profile: null, error: 'not_found' };
  }

  return {
    profile: null,
    error: 'query',
    message: first.error?.message ?? 'No se pudo cargar el perfil',
  };
}

export async function resolveProfileIdByUsername(
  client: SupabaseClient,
  username: string | string[] | undefined,
): Promise<{ id: string; username: string } | null> {
  const normalized = normalizeUsernameParam(username);
  if (!normalized) return null;

  const { data, error } = await client
    .from('profiles')
    .select('id, username')
    .eq('username', normalized)
    .maybeSingle();

  if (error || !data?.id || !data.username) return null;
  return { id: data.id, username: data.username };
}

/** Select de perfiles por ids con fallback si falta bio. */
export async function fetchProfilesByIds(
  client: SupabaseClient,
  ids: string[],
): Promise<{ rows: PublicProfileRow[]; error: null } | { rows: []; error: Error }> {
  if (ids.length === 0) return { rows: [], error: null };

  const first = await client
    .from('profiles')
    .select(PROFILE_PUBLIC_SELECT_WITH_BIO)
    .in('id', ids)
    .not('username', 'is', null);

  if (!first.error) {
    return { rows: (first.data ?? []) as unknown as PublicProfileRow[], error: null };
  }

  if (isMissingProfileColumn(first.error, 'bio')) {
    const fallback = await client
      .from('profiles')
      .select(PROFILE_PUBLIC_SELECT_CORE)
      .in('id', ids)
      .not('username', 'is', null);

    if (fallback.error) {
      return { rows: [], error: new Error(fallback.error.message) };
    }

    return {
      rows: ((fallback.data ?? []) as unknown as PublicProfileRow[]).map((row) => ({
        ...row,
        bio: null,
      })),
      error: null,
    };
  }

  return { rows: [], error: new Error(first.error.message) };
}
