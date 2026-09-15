export function isAutoUsername(username?: string | null) {
  return !username || /^user_[a-f0-9]{8}$/i.test(username);
}

export function suggestUsername(displayName?: string | null) {
  const trimmed = displayName?.trim();
  if (!trimmed) return '';

  const slug = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);

  return slug.length >= 3 ? slug : '';
}

function withNumericSuffix(base: string, n: number) {
  const suffix = `_${n}`;
  const maxBase = Math.max(1, 24 - suffix.length);
  return `${base.slice(0, maxBase)}${suffix}`;
}

/**
 * Siguiente username a partir del nombre visible.
 * 1ª vez → slug base; si ya está aplicado → base_2, base_3…
 */
export function nextSuggestedUsername(
  displayName?: string | null,
  currentUsername?: string | null,
) {
  const base = suggestUsername(displayName);
  if (!base) return '';

  const current = (currentUsername ?? '').trim().toLowerCase();
  if (!current || (current !== base && !current.startsWith(`${base}_`))) {
    return base;
  }
  if (current === base) return withNumericSuffix(base, 2);

  const match = current.match(/_(\d+)$/);
  const next = match ? Number(match[1]) + 1 : 2;
  if (!Number.isFinite(next) || next < 2 || next > 9999) return withNumericSuffix(base, 2);
  return withNumericSuffix(base, next);
}

export function isProfileIncomplete(profile?: {
  display_name?: string | null;
  username?: string | null;
}) {
  if (!profile) return true;
  if (!profile.display_name || profile.display_name.length < 2) return true;
  return isAutoUsername(profile.username);
}
