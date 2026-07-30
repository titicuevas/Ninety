import { friendlyApiError } from '@/lib/friendlyErrors';

/**
 * En desarrollo, URL vacía → Vite proxy `/api` → localhost:3001 (evita CORS con 127.0.0.1).
 * En producción, VITE_API_URL o fallback Railway.
 */
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

const API_URL = resolveApiUrl();

export class ApiError extends Error {
  status: number;
  capsuleId?: string;

  constructor(message: string, status: number, extras?: { capsuleId?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.capsuleId = extras?.capsuleId;
  }
}

async function parseError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as {
    error?: unknown;
    capsule_id?: unknown;
  };

  let message = `Error ${response.status}`;
  if (typeof body.error === 'string') {
    message = friendlyApiError(body.error);
  } else if (typeof body.error === 'object' && body.error !== null) {
    message = 'Datos inválidos. Revisa el formulario.';
  }

  return new ApiError(message, response.status, {
    capsuleId: typeof body.capsule_id === 'string' ? body.capsule_id : undefined,
  });
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
    throw new ApiError(friendlyApiError(raw), 0);
  }

  if (!response.ok) {
    throw await parseError(response);
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
    throw new ApiError(friendlyApiError(raw), 0);
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
}
