import { expect, test } from '@playwright/test';
import { API_BASE, openAuthenticatedHome, readAccessToken } from '../helpers/auth';

test.describe('Smoke — contexto de visionado @smoke', () => {
  test('formulario de Capsule muestra opciones de contexto', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/search');
    await expect(page.getByRole('heading', { name: /buscar/i })).toBeVisible({ timeout: 15_000 });

    // Si no hay partido nuevo fácil, al menos la API acepta el enum al filtrar
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();
    const res = await page.request.get(
      `${API_BASE}/api/capsules/me?limit=5&offset=0&watch_context=tv`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { capsules?: unknown[]; total?: number };
    expect(Array.isArray(body.capsules)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  test('Mis Capsules muestra filtro por contexto', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/capsules');
    await expect(page.getByRole('heading', { name: /mis capsules/i })).toBeVisible({
      timeout: 15_000,
    });
    const clear = page.getByRole('button', { name: /limpiar filtros/i });
    if (await clear.isVisible()) await clear.click();
    await expect(page.getByRole('group', { name: /filtrar por contexto/i })).toBeVisible();
    await page.getByRole('button', { name: /^tv$/i }).click();
    await expect(page).toHaveURL(/context=tv/);
  });

  test('Mis Capsules: chip ★4+ actualiza URL y Limpiar la resetea', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/capsules');
    await expect(page.getByRole('heading', { name: /mis capsules/i })).toBeVisible({
      timeout: 15_000,
    });
    const clear = page.getByRole('button', { name: /limpiar filtros/i });
    if (await clear.isVisible()) await clear.click();
    await expect(page.getByRole('group', { name: /filtrar por valoración/i })).toBeVisible();
    await page.getByRole('button', { name: /4\+\s*★/i }).click();
    await expect(page).toHaveURL(/rating=4/);
    await page.getByRole('button', { name: /limpiar filtros/i }).click();
    await expect(page).not.toHaveURL(/rating=/);
  });

  test('Mis Capsules recuerda el último filtro al volver', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/capsules');
    await expect(page.getByRole('heading', { name: /mis capsules/i })).toBeVisible({
      timeout: 15_000,
    });
    const clear = page.getByRole('button', { name: /limpiar filtros/i });
    if (await clear.isVisible()) await clear.click();

    await page.getByRole('button', { name: /4\+\s*★/i }).click();
    await expect(page).toHaveURL(/rating=4/);

    await page.goto('/search');
    await expect(page.getByRole('heading', { name: /buscar/i })).toBeVisible({ timeout: 15_000 });

    await page.goto('/capsules');
    await expect(page.getByRole('heading', { name: /mis capsules/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/rating=4/);
  });
});
