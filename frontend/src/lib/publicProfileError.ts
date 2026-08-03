import { ApiError } from '@/lib/api';

/** 404 de perfil público vs fallo transitorio (red/5xx) — no mostrar “no encontrado” por cualquier error. */
export function isPublicProfileNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
