import { apiFetch, ApiError } from '@/lib/api';

export type CollectionsImportResult = {
  imported: number;
  skipped_duplicate: number;
  skipped_invalid: number;
  skipped_duplicate_in_file: number;
  skipped_invalid_items: number;
  skipped_missing_capsule: number;
  skipped_limit: number;
  items_linked: number;
  total_in_file: number;
  message: string;
};

const MAX_IMPORT_FILE_BYTES = 1_000_000;

/** Lee y parsea un archivo JSON de export de colecciones (validación mínima en cliente). */
export async function readCollectionsImportFile(file: File): Promise<unknown> {
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

/** Envía el payload al API. Un solo resultado (sin spam de toasts por colección). */
export async function uploadCollectionsImport(
  payload: unknown,
  accessToken: string,
): Promise<CollectionsImportResult> {
  return apiFetch<CollectionsImportResult>(
    '/api/collections/me/import',
    { method: 'POST', body: JSON.stringify(payload) },
    accessToken,
  );
}
