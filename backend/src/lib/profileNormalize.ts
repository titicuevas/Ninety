export type ProfileRow = {
  id: string;
  username: string | null;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url: string | null;
  favorite_team: string | null;
  country: string | null;
  city: string | null;
  bio?: string | null;
  created_at: string;
  updated_at?: string;
  is_admin?: boolean | null;
};

export function normalizeProfile(row: ProfileRow, options?: { includeAdmin?: boolean }) {
  const { is_admin: _isAdmin, ...rest } = row;
  const base = {
    ...rest,
    display_name: row.display_name ?? row.full_name ?? null,
    bio: row.bio ?? null,
  };

  if (options?.includeAdmin) {
    return { ...base, is_admin: Boolean(row.is_admin) };
  }

  return base;
}

export function profileUpdatePayload(input: {
  display_name?: string;
  username?: string;
  avatar_url?: string | null;
  favorite_team?: string | null;
  country?: string | null;
  city?: string | null;
  bio?: string | null;
}) {
  const { display_name, bio, ...rest } = input;
  const payload: Record<string, unknown> = { ...rest };

  if (display_name !== undefined) {
    payload.full_name = display_name;
  }

  if (bio !== undefined) {
    payload.bio = bio?.trim() ? bio.trim() : null;
  }

  return payload;
}
