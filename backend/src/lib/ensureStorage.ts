import { supabaseAdmin } from './supabase.js';

export const CAPSULE_PHOTOS_BUCKET = 'capsule-photos';

export async function ensureCapsulePhotosBucket() {
  if (!supabaseAdmin) {
    console.warn('⚠️  SUPABASE_SECRET_KEY no configurada: no se puede crear el bucket de fotos.');
    return;
  }

  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
  if (error) {
    throw new Error(`Storage: ${error.message}`);
  }

  const exists = buckets?.some((bucket) => bucket.id === CAPSULE_PHOTOS_BUCKET);
  if (exists) return;

  const { error: createError } = await supabaseAdmin.storage.createBucket(CAPSULE_PHOTOS_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });

  if (createError) {
    throw new Error(`No se pudo crear el bucket de fotos: ${createError.message}`);
  }

  console.log(`✅ Bucket "${CAPSULE_PHOTOS_BUCKET}" creado`);
}

export function publicPhotoUrl(path: string) {
  if (!supabaseAdmin) throw new Error('Storage no disponible');
  const { data } = supabaseAdmin.storage.from(CAPSULE_PHOTOS_BUCKET).getPublicUrl(path);
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

export async function deleteCapsulePhotoByUrl(photoUrl: string) {
  if (!supabaseAdmin) return;

  const marker = `/storage/v1/object/public/${CAPSULE_PHOTOS_BUCKET}/`;
  const index = photoUrl.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(photoUrl.slice(index + marker.length));
  await supabaseAdmin.storage.from(CAPSULE_PHOTOS_BUCKET).remove([path]);
}
