import { deleteAvatarByUrl, deleteCapsulePhotosByUrls, isManagedAvatarUrl } from './ensureStorage.js';
import { supabaseAdmin } from './supabase.js';

export { isAccountDeleteEmailConfirmed, normalizeAccountEmail } from './deleteAccountConfirm.js';

export type DeleteAccountResult = { ok: true } | { ok: false; error: string; status: number };

/**
 * Elimina la cuenta y datos asociados (cascade en Postgres).
 * Limpia fotos de Capsules y avatar en Storage antes del borrado en Auth.
 */
export async function deleteUserAccount(userId: string): Promise<DeleteAccountResult> {
  if (!supabaseAdmin) {
    return { ok: false, error: 'Servicio no disponible', status: 503 };
  }

  const [{ data: profile }, { data: capsules }] = await Promise.all([
    supabaseAdmin.from('profiles').select('avatar_url').eq('id', userId).maybeSingle(),
    supabaseAdmin.from('capsules').select('photo_urls').eq('user_id', userId),
  ]);

  const allPhotoUrls: string[] = [];
  for (const cap of capsules ?? []) {
    if (!Array.isArray(cap.photo_urls)) continue;
    for (const url of cap.photo_urls) {
      if (typeof url === 'string' && url.trim()) allPhotoUrls.push(url.trim());
    }
  }

  await deleteCapsulePhotosByUrls(allPhotoUrls, userId);

  const avatarUrl = profile?.avatar_url;
  if (typeof avatarUrl === 'string' && isManagedAvatarUrl(avatarUrl)) {
    await deleteAvatarByUrl(avatarUrl);
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    return { ok: false, error: error.message, status: 400 };
  }

  return { ok: true };
}
