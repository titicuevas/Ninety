import { friendlyApiError } from '@/lib/friendlyErrors';

/**
 * En desarrollo, URL vacía → Vite proxy `/api` → localhost:3001 (evita CORS con 127.0.0.1).
 * En producción, VITE_API_URL o fallback Railway.
 */
function resolveApiUrl(): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  if (configured) return configured;
  if (import.meta.env.PROD) return 'https://ninety-api.up.railway.app';
  return '';
}

const API_URL = resolveApiUrl();

async function parseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  if (typeof body.error === 'string') {
    return friendlyApiError(body.error);
  }
  if (typeof body.error === 'object' && body.error !== null) {
    return 'Datos inválidos. Revisa el formulario.';
  }
  return `Error ${response.status}`;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Failed to fetch';
    throw new Error(friendlyApiError(raw));
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  token?: string | null,
): Promise<T> {
  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Failed to fetch';
    throw new Error(friendlyApiError(raw));
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}
