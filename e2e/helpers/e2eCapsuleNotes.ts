import type { APIRequestContext, Page } from '@playwright/test';
import { API_BASE, readAccessToken } from './auth';

/** Mismo criterio que backend/src/lib/demoSocialSeed.ts */
export function isE2eLeftoverNote(note: string | null | undefined): boolean {
  return /^(Guardado E2E \d+|E2E fotos \d+|Test E2E\b)/i.test((note ?? '').trim());
}

/** Restaura la reseña de una Capsule propia (el e2e de editar no debe ensuciar el perfil). */
export async function restoreCapsuleNote(
  page: Page,
  request: APIRequestContext,
  capsuleId: string,
  note: string,
): Promise<void> {
  const token = await readAccessToken(page);
  if (!token) return;

  const restored = isE2eLeftoverNote(note) ? null : note.trim() ? note : null;
  await request.patch(`${API_BASE}/api/capsules/${capsuleId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: { note: restored },
  });
}

/** Borra una Capsule propia creada por e2e (fotos, partido nuevo). */
export async function deleteOwnCapsule(
  page: Page,
  request: APIRequestContext,
  capsuleId: string,
): Promise<void> {
  const token = await readAccessToken(page);
  if (!token) return;

  await request.delete(`${API_BASE}/api/capsules/${capsuleId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
