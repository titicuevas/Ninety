import { apiFetch, ApiError } from '@/lib/api';

export type DiaryImportResult = {
  imported: number;
  skipped_duplicate: number;
  skipped_invalid: number;
  skipped_duplicate_in_file: number;
  total_in_file: number;
  photos_restored?: number;
  photos_failed?: number;
  photos_skipped_limit?: number;
  capsules_with_photos?: number;
  message: string;
};

const MAX_IMPORT_FILE_BYTES = 1_000_000;

/** Lee y parsea un archivo JSON de export (validación mínima en cliente). */
export async function readDiaryImportFile(file: File): Promise<unknown> {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new ApiError('El archivo supera 1 MB. Reduce el export o divídelo.', 400);
  }

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  const looksJson =
    name.endsWith('.json') ||
    type === 'application/json' ||
    type === 'text/json' ||
    type === '' ||
    type === 'application/octet-stream';

  if (!looksJson) {
    throw new ApiError('Selecciona un archivo JSON exportado desde Ninety.', 400);
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new ApiError('No se pudo leer el archivo.', 400);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError('El archivo no es un JSON válido.', 400);
  }
}

/** Envía el payload al API. Un solo resultado (sin spam de toasts por Capsule). */
export async function uploadDiaryImport(
  payload: unknown,
  accessToken: string,
  options?: { restorePhotos?: boolean },
): Promise<DiaryImportResult> {
  const body =
    options?.restorePhotos &&
    payload != null &&
    typeof payload === 'object' &&
    !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>), restore_photos: true }
      : payload;

  return apiFetch<DiaryImportResult>(
    '/api/capsules/me/import',
    { method: 'POST', body: JSON.stringify(body) },
    accessToken,
  );
}
