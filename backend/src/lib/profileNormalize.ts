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
};

export function normalizeProfile(row: ProfileRow) {
  return {
    ...row,
    display_name: row.display_name ?? row.full_name ?? null,
  };
}

export function profileUpdatePayload(input: {
  display_name?: string;
  username?: string;
  avatar_url?: string | null;
  favorite_team?: string | null;
  country?: string | null;
  city?: string | null;
}) {
  const { display_name, ...rest } = input;
  const payload: Record<string, unknown> = { ...rest };

  if (display_name !== undefined) {
    payload.full_name = display_name;
  }

  return payload;
}
