import { ApiError } from '@/lib/api';
import { friendlyApiError } from '@/lib/friendlyErrors';

function resolveApiUrl(): string {
  const viteEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env
      : undefined;
  const configured = (viteEnv?.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  if (configured) return configured;
  if (viteEnv?.PROD) return 'https://ninety-api.up.railway.app';
  return '';
}

/** Descarga el export JSON de colecciones del usuario autenticado. Sin secretos. */
export async function downloadCollectionsExport(accessToken: string): Promise<void> {
  const API_URL = resolveApiUrl();
  const path = '/api/collections/me/export';

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Failed to fetch';
    throw new ApiError(friendlyApiError(raw), 0);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: unknown };
    const message =
      typeof body.error === 'string' ? friendlyApiError(body.error) : `Error ${response.status}`;
    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] ?? 'ninety-colecciones.json';

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
