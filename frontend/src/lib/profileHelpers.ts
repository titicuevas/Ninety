export function isAutoUsername(username?: string | null) {
  return !username || /^user_[a-f0-9]{8}$/i.test(username);
}

export function suggestUsername(displayName: string) {
  const slug = displayName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);

  return slug.length >= 3 ? slug : '';
}

export function isProfileIncomplete(profile?: {
  display_name?: string | null;
  username?: string | null;
}) {
  if (!profile) return true;
  if (!profile.display_name || profile.display_name.length < 2) return true;
  return isAutoUsername(profile.username);
}
