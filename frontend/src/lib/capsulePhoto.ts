import { apiFetch, apiUpload } from '@/lib/api';
import { MAX_CAPSULE_PHOTOS } from '@/lib/capsulePhotos';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.82;

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const HEIC_TYPES = new Set(['image/heic', 'image/heif']);

/** accept del input galería (sin capture): MIME + extensiones para iOS/Android. */
export const GALLERY_ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';

/** Cámara: accept amplio; el dispositivo suele entregar JPEG. */
export const CAMERA_ACCEPT = 'image/*';

export function guessImageMime(file: { name: string; type: string }): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    default:
      return file.type || '';
  }
}

export function validateCapsulePhoto(file: File): string | null {
  // El tamaño se revalida tras comprimir; aquí solo avisamos si es absurdo (>25 MB crudo).
  if (file.size > 25 * 1024 * 1024) {
    return 'La foto es demasiado grande. Prueba otra o comprímela antes.';
  }

  const mime = guessImageMime(file);
  if (HEIC_TYPES.has(mime)) {
    // Se intenta convertir en prepareCapsulePhoto; si falla, mensaje allí.
    return null;
  }
  if (!ALLOWED_TYPES.has(mime) && mime !== '') {
    return 'Usa JPG, PNG o WebP. En iPhone, si falla HEIC, elige “Más compatible” o haz la foto con la cámara.';
  }
  if (!mime) {
    return 'No se reconoce el formato de la imagen.';
  }
  return null;
}

/** Acepta hasta el hueco disponible; ignora el resto del lote. */
export function takeCapsulePhotosWithinLimit(files: File[], existingCount = 0): {
  accepted: File[];
  truncated: number;
} {
  const room = Math.max(0, MAX_CAPSULE_PHOTOS - existingCount);
  return {
    accepted: files.slice(0, room),
    truncated: Math.max(0, files.length - room),
  };
}

function loadImageBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file).catch(async () => loadHtmlImage(file));
  }
  return loadHtmlImage(file);
}

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('DECODE'));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('ENCODE'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Redimensiona y convierte a JPEG para móvil/PC (incluye intento HEIC en Safari).
 * Mantiene el archivo si ya es JPEG/PNG/WebP pequeño y dentro del límite.
 */
export async function prepareCapsulePhoto(file: File): Promise<File> {
  const mime = guessImageMime(file);
  const preError = validateCapsulePhoto(file);
  if (preError && !HEIC_TYPES.has(mime)) {
    throw new Error(preError);
  }

  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await loadImageBitmap(file);
  } catch {
    if (HEIC_TYPES.has(mime)) {
      throw new Error(
        'No se pudo leer HEIC en este dispositivo. Usa la cámara de Ninety o exporta la foto como JPG.',
      );
    }
    throw new Error('No se pudo leer la imagen. Prueba otro archivo o formato JPG.');
  }

  const width = 'naturalWidth' in bitmap ? bitmap.naturalWidth || bitmap.width : bitmap.width;
  const height = 'naturalHeight' in bitmap ? bitmap.naturalHeight || bitmap.height : bitmap.height;

  if (!width || !height) {
    if ('close' in bitmap) bitmap.close();
    throw new Error('La imagen no tiene un tamaño válido.');
  }

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const alreadyOk =
    ALLOWED_TYPES.has(mime) &&
    file.size <= MAX_PHOTO_BYTES &&
    scale === 1 &&
    mime === 'image/jpeg';

  if (alreadyOk) {
    if ('close' in bitmap) bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if ('close' in bitmap) bitmap.close();
    throw new Error('No se pudo preparar la foto en este navegador.');
  }

  ctx.fillStyle = '#0a0a0b';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  if ('close' in bitmap) bitmap.close();

  let quality = JPEG_QUALITY;
  let blob = await canvasToJpegBlob(canvas, quality);
  while (blob.size > MAX_PHOTO_BYTES && quality > 0.45) {
    quality -= 0.1;
    blob = await canvasToJpegBlob(canvas, quality);
  }

  if (blob.size > MAX_PHOTO_BYTES) {
    throw new Error('La foto sigue siendo demasiado grande tras comprimirla. Prueba otra.');
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'foto';
  return new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export async function prepareCapsulePhotos(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => prepareCapsulePhoto(file)));
}

export async function uploadCapsulePhotos(files: File[], accessToken: string) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('photos', file);
  }

  const { urls } = await apiUpload<{ urls: string[] }>('/api/capsules/photos', formData, accessToken);
  return urls;
}

export async function deleteCapsulePhotoByUrl(photoUrl: string, accessToken: string) {
  await apiFetch(
    '/api/capsules/photos',
    {
      method: 'DELETE',
      body: JSON.stringify({ url: photoUrl }),
    },
    accessToken,
  );
}

export async function deleteCapsulePhotosByUrls(photoUrls: string[], accessToken: string) {
  await Promise.all(photoUrls.map((url) => deleteCapsulePhotoByUrl(url, accessToken).catch(() => undefined)));
}
