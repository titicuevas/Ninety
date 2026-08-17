import type { APIRequestContext, Page } from '@playwright/test';
import { API_BASE, readAccessToken } from './auth';

/** Mismo criterio que backend/src/lib/demoSocialSeed.ts */
export function isE2eLeftoverCollectionName(name: string): boolean {
  return /^E2E(\s|$)/i.test(name.trim());
}

/** Borra listas `E2E …` de la cuenta QA para no ensuciar el perfil público. */
export async function deleteOwnE2eCollections(
  page: Page,
  request: APIRequestContext,
): Promise<void> {
  const token = await readAccessToken(page);
  if (!token) return;

  const headers = { Authorization: `Bearer ${token}` };
  const res = await request.get(`${API_BASE}/api/collections/me`, { headers });
  if (!res.ok()) return;

  const body = (await res.json()) as { collections?: Array<{ id: string; name: string }> };
  for (const collection of body.collections ?? []) {
    if (!isE2eLeftoverCollectionName(collection.name)) continue;
    await request.delete(`${API_BASE}/api/collections/${collection.id}`, { headers });
  }
}
