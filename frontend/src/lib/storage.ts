import { supabase } from '@/lib/supabase';

export const CAPSULE_PHOTOS_BUCKET = 'capsule-photos';

export async function uploadCapsulePhoto(userId: string, file: File, capsuleId: string) {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/${capsuleId}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage.from(CAPSULE_PHOTOS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const { data: publicUrl } = supabase.storage.from(CAPSULE_PHOTOS_BUCKET).getPublicUrl(data.path);
  return publicUrl.publicUrl;
}

export async function deleteCapsulePhoto(path: string) {
  const { error } = await supabase.storage.from(CAPSULE_PHOTOS_BUCKET).remove([path]);
  if (error) throw error;
}
