import {
  CAPSULE_PHOTOS_BUCKET,
  deleteCapsulePhoto,
  uploadCapsulePhoto,
} from '@/lib/storage';

/** Hook para subir fotos de Capsules (v1). */
export function useCapsuleStorage() {
  return {
    bucket: CAPSULE_PHOTOS_BUCKET,
    uploadCapsulePhoto,
    deleteCapsulePhoto,
  };
}
