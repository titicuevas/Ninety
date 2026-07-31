import { expect, test } from '@playwright/test';
import { API_BASE, openAuthenticatedHome, readAccessToken } from '../helpers/auth';

test.describe('Smoke — notificaciones @smoke', () => {
  test('página de notificaciones accesible desde la campanita', async ({ page }) => {
    await openAuthenticatedHome(page);

    const bell = page.getByRole('link', { name: /notificaciones/i }).first();
    await expect(bell).toBeVisible({ timeout: 10_000 });
    await bell.click();

    await expect(page).toHaveURL(/\/notifications/);
    await expect(
      page.getByRole('heading', { name: /notificaciones/i }),
    ).toBeVisible();
  });

  test('muestra estado vacío o lista de notificaciones', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/notifications');
    await page.waitForURL(/\/notifications/);

    const empty = page.getByText(/sin notificaciones/i);
    const list = page.locator('[class*="divide-"]');

    await expect(empty.or(list)).toBeVisible({ timeout: 15_000 });

    const loadMore = page.getByRole('button', { name: /cargar más/i });
    if (await loadMore.isVisible()) {
      await expect(loadMore).toBeEnabled();
    }
  });

  test('UI de push: activar, desactivar o sin configurar', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/notifications');
    await page.waitForURL(/\/notifications/);
    await expect(page.getByRole('heading', { name: /notificaciones/i })).toBeVisible();

    const enable = page.getByRole('button', { name: /activar alertas/i });
    const disable = page.getByRole('button', { name: /desactivar alertas/i });
    const testPush = page.getByRole('button', { name: /enviar prueba/i });
    const enabledLabel = page.getByText(/alertas activadas/i);
    const empty = page.getByText(/sin notificaciones/i);
    const list = page.locator('[class*="divide-"]');
    const diagnostics = page.getByTestId('push-diagnostics');

    await expect(empty.or(list).or(enable).or(disable).or(enabledLabel).or(diagnostics)).toBeVisible({
      timeout: 15_000,
    });

    if (await enable.isVisible()) {
      await expect(enable).toBeEnabled();
    }
    if (await disable.isVisible()) {
      await expect(enabledLabel).toBeVisible();
      await expect(testPush).toBeVisible();
    }

    // Diagnóstico demoted: solo si push no está listo o el permiso está bloqueado
    if (await diagnostics.isVisible()) {
      await expect(diagnostics).toContainText(/alertas push/i);
    }
  });

  test('deep link #comments abre el panel en el detalle', async ({ page, request }) => {
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const me = await request.get(`${API_BASE}/api/capsules/me?limit=1&offset=0`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok()).toBeTruthy();
    const body = (await me.json()) as { capsules?: Array<{ id: string }> };
    const capsuleId = body.capsules?.[0]?.id;
    if (!capsuleId) {
      test.skip(true, 'La cuenta QA no tiene Capsules para probar #comments');
      return;
    }

    await page.goto(`/c/${capsuleId}#comments`);
    await expect(page).toHaveURL(new RegExp(`/c/${capsuleId}`));
    await expect(page.getByRole('button', { name: /ocultar comentarios/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByLabel(/nuevo comentario/i).or(page.getByText(/sé el primero en comentar/i)),
    ).toBeVisible();
  });
});
