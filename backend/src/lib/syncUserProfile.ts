import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase.js';

const AUTO_USERNAME = /^user_[a-f0-9]{8}$/i;

function readMetaString(meta: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function slugifyUsername(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
}

async function generateUniqueUsername(
  admin: SupabaseClient,
  displayName: string,
  email?: string | null,
) {
  const base =
    slugifyUsername(displayName) ||
    slugifyUsername(email?.split('@')[0] ?? '') ||
    'aficionado';

  let candidate = base.length >= 3 ? base : `fan_${base}`;
  let suffix = 0;

  while (suffix < 50) {
    const username = suffix === 0 ? candidate : `${candidate.slice(0, 20)}_${suffix}`;
    const { data } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
    if (!data) return username;
    suffix += 1;
  }

  return `${candidate.slice(0, 16)}_${Math.random().toString(36).slice(2, 6)}`;
}

export async function syncUserProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const admin = supabaseAdmin;
  if (!admin) return;

  const meta = user.user_metadata ?? {};
  const displayName =
    readMetaString(meta, 'full_name', 'name', 'display_name') ?? user.email?.split('@')[0] ?? null;
  const avatarUrl = readMetaString(meta, 'avatar_url', 'picture');

  const { data: existing } = await admin
    .from('profiles')
    .select('username, full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const updates: Record<string, unknown> = {};

  if (displayName && (!existing?.full_name || existing.full_name.length < 2)) {
    updates.full_name = displayName;
  }

  if (avatarUrl && !existing?.avatar_url) {
    updates.avatar_url = avatarUrl;
  }

  const needsUsername = !existing?.username || AUTO_USERNAME.test(existing.username);
  if (needsUsername && displayName) {
    updates.username = await generateUniqueUsername(admin, displayName, user.email);
  }

  if (Object.keys(updates).length === 0) return;

  await admin.from('profiles').update(updates).eq('id', user.id);
}

export function isAutoUsername(username: string | null | undefined) {
  return !username || AUTO_USERNAME.test(username);
}
