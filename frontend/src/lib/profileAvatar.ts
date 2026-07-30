import { apiFetch, apiUpload } from '@/lib/api';
import { GALLERY_ACCEPT, prepareCapsulePhotos, validateCapsulePhoto } from '@/lib/capsulePhoto';
import type { Profile } from '@/types/profile';

export { GALLERY_ACCEPT as AVATAR_ACCEPT };

export async function uploadProfileAvatar(file: File, accessToken: string): Promise<Profile> {
  const validationError = validateCapsulePhoto(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const preparedList = await prepareCapsulePhotos([file]);
  const prepared = preparedList[0];
  if (!prepared) {
    throw new Error('No se pudo preparar la foto.');
  }
  const formData = new FormData();
  formData.append('avatar', prepared);

  return apiUpload<Profile>('/api/profile/avatar', formData, accessToken);
}

export async function removeProfileAvatar(accessToken: string): Promise<Profile> {
  return apiFetch<Profile>('/api/profile/avatar', { method: 'DELETE' }, accessToken);
}
