import { supabaseAdmin } from './supabase.js';

export const CAPSULE_PHOTOS_BUCKET = 'capsule-photos';
export const AVATARS_BUCKET = 'avatars';

async function ensureBucket(
  bucketId: string,
  missingSecretMessage: string,
) {
  if (!supabaseAdmin) {
    console.warn(missingSecretMessage);
    return;
  }

  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
  if (error) {
    throw new Error(`Storage: ${error.message}`);
  }

  const exists = buckets?.some((bucket) => bucket.id === bucketId);
  if (exists) return;

  const { error: createError } = await supabaseAdmin.storage.createBucket(bucketId, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });

  if (createError) {
    throw new Error(`No se pudo crear el bucket ${bucketId}: ${createError.message}`);
  }

  console.log(`✅ Bucket "${bucketId}" creado`);
}

export async function ensureCapsulePhotosBucket() {
  await ensureBucket(
    CAPSULE_PHOTOS_BUCKET,
    '⚠️  SUPABASE_SECRET_KEY no configurada: no se puede crear el bucket de fotos.',
  );
}

export async function ensureAvatarsBucket() {
  await ensureBucket(
    AVATARS_BUCKET,
    '⚠️  SUPABASE_SECRET_KEY no configurada: no se puede crear el bucket de avatares.',
  );
}

export function publicPhotoUrl(path: string) {
  if (!supabaseAdmin) throw new Error('Storage no disponible');
  const { data } = supabaseAdmin.storage.from(CAPSULE_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function publicAvatarUrl(path: string) {
  if (!supabaseAdmin) throw new Error('Storage no disponible');
  const { data } = supabaseAdmin.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadCapsulePhotoBuffer(
  userId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error('El almacén de fotos no está configurado en el servidor.');
  }

  await ensureCapsulePhotosBucket();

  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabaseAdmin.storage.from(CAPSULE_PHOTOS_BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return publicPhotoUrl(path);
}

export async function uploadAvatarBuffer(
  userId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error('El almacén de avatares no está configurado en el servidor.');
  }

  await ensureAvatarsBucket();

  const { data: existing } = await supabaseAdmin.storage.from(AVATARS_BUCKET).list(userId);
  if (existing?.length) {
    await supabaseAdmin.storage
      .from(AVATARS_BUCKET)
      .remove(existing.map((file) => `${userId}/${file.name}`));
  }

  const path = `${userId}/avatar.jpg`;

  const { error } = await supabaseAdmin.storage.from(AVATARS_BUCKET).upload(path, buffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return `${publicAvatarUrl(path)}?v=${Date.now()}`;
}

export async function deleteCapsulePhotoByUrl(photoUrl: string) {
  if (!supabaseAdmin) return;

  const marker = `/storage/v1/object/public/${CAPSULE_PHOTOS_BUCKET}/`;
  const index = photoUrl.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(photoUrl.slice(index + marker.length).split('?')[0]!);
  await supabaseAdmin.storage.from(CAPSULE_PHOTOS_BUCKET).remove([path]);
}

export async function deleteAvatarByUrl(avatarUrl: string) {
  if (!supabaseAdmin) return;

  const marker = `/storage/v1/object/public/${AVATARS_BUCKET}/`;
  const index = avatarUrl.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(avatarUrl.slice(index + marker.length).split('?')[0]!);
  await supabaseAdmin.storage.from(AVATARS_BUCKET).remove([path]);
}

export function isManagedAvatarUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes(`/storage/v1/object/public/${AVATARS_BUCKET}/`);
}
