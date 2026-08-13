import { publicProfileUrl } from '@/lib/siteUrl';

export type ProfileShareSummary = {
  username: string;
  displayName?: string | null;
  favoriteTeam?: string | null;
  city?: string | null;
  country?: string | null;
  publicCapsulesCount?: number | null;
  collectionsCount?: number | null;
  achievementsCount?: number | null;
  followersCount?: number | null;
};

/**
 * Texto listo para copiar/compartir un perfil público (one-tap).
 * Resume club, ubicación, Capsules y listas + enlace al diario.
 */
export function buildProfileShareText(summary: ProfileShareSummary): string {
  const username = summary.username.trim();
  const name = summary.displayName?.trim() || (username ? `@${username}` : 'Aficionado');
  const url = username ? publicProfileUrl(username) : '';

  const lines = [`⚽ ${name} en Ninety`];
  if (username) lines.push(`@${username}`);

  const details: string[] = [];
  const team = summary.favoriteTeam?.trim();
  if (team) details.push(`Club: ${team}`);

  const location = [summary.city?.trim(), summary.country?.trim()].filter(Boolean).join(', ');
  if (location) details.push(location);

  const capsules = summary.publicCapsulesCount ?? 0;
  if (capsules > 0) {
    details.push(`${capsules} Capsule${capsules === 1 ? '' : 's'} pública${capsules === 1 ? '' : 's'}`);
  }

  const collections = summary.collectionsCount ?? 0;
  if (collections > 0) {
    details.push(`${collections} lista${collections === 1 ? '' : 's'}`);
  }

  const achievements = summary.achievementsCount ?? 0;
  if (achievements > 0) {
    details.push(`${achievements} logro${achievements === 1 ? '' : 's'}`);
  }

  const followers = summary.followersCount ?? 0;
  if (followers > 0) {
    details.push(`${followers} seguidor${followers === 1 ? '' : 'es'}`);
  }

  if (details.length > 0) {
    lines.push('', ...details);
  }

  if (url) lines.push('', url);
  return lines.join('\n');
}
