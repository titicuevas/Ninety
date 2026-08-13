import { expect, test } from '@playwright/test';
import { API_BASE, openAuthenticatedHome, readAccessToken } from '../helpers/auth';

test.describe('Smoke — notificaciones @smoke', () => {
  test('página de notificaciones accesible desde la campanita o tab Alertas', async ({ page }) => {
    await openAuthenticatedHome(page);

    const entry = page.getByRole('banner').getByRole('link', { name: /notificaciones/i });
    await expect(entry).toBeVisible({ timeout: 10_000 });
    await entry.click();

    await expect(page).toHaveURL(/\/notifications/);
    await expect(page.getByRole('heading', { level: 1, name: /notificaciones/i })).toBeVisible();
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.getByRole('heading', { name: /alertas push/i })).toBeVisible();
  });

  test('muestra estado vacío o lista de notificaciones', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/notifications');
    await page.waitForURL(/\/notifications/);

    const empty = page.getByText(/sin notificaciones/i);
    const list = page.getByTestId('notifications-list');
    const filters = page.getByTestId('notification-type-filters');

    await expect(filters).toBeVisible({ timeout: 15_000 });
    await expect(empty.or(list)).toBeVisible({ timeout: 15_000 });

    if (await empty.isVisible()) {
      await expect(page.getByRole('link', { name: /ir al feed/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /buscar aficionados/i })).toBeVisible();
    }

    if (await list.isVisible()) {
      const matchLine = page.getByTestId('notification-match').first();
      if (await matchLine.isVisible()) {
        await expect(matchLine).toContainText(/\bvs\b/i);
      }

      const followBack = page.getByTestId('follow-back-button').first();
      if (await followBack.isVisible()) {
        await expect(followBack).toHaveAttribute(
          'aria-label',
          /seguir de vuelta|dejar de seguir|siguiendo/i,
        );
      }
    }

    const loadMore = page.getByRole('button', { name: /cargar más/i });
    if (await loadMore.isVisible()) {
      await expect(loadMore).toBeEnabled();
    }
  });

  test('filtros por tipo en URL (likes / comentarios / follows)', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/notifications');
    await page.waitForURL(/\/notifications/);

    const filters = page.getByTestId('notification-type-filters');
    await expect(filters).toBeVisible({ timeout: 15_000 });

    const likesChip = filters.getByRole('button', { name: /me gusta/i });
    await likesChip.click();
    await expect(page).toHaveURL(/type=like/);
    await expect(likesChip).toHaveAttribute('aria-pressed', 'true');

    const commentsChip = filters.getByRole('button', { name: /^comentarios$/i });
    await commentsChip.click();
    await expect(page).toHaveURL(/type=comment/);
    await expect(commentsChip).toHaveAttribute('aria-pressed', 'true');

    const followsChip = filters.getByRole('button', { name: /^seguidores$/i });
    await followsChip.click();
    await expect(page).toHaveURL(/type=follow/);
    await expect(followsChip).toHaveAttribute('aria-pressed', 'true');

    const clear = filters.getByRole('button', { name: /quitar filtro/i });
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(page).not.toHaveURL(/type=/);
    await expect(filters.getByRole('button', { name: /^todas$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('UI de push: activar, desactivar o sin configurar', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/notifications');
    await page.waitForURL(/\/notifications/);
    await expect(page.getByRole('heading', { name: /notificaciones/i })).toBeVisible();

    const panel = page.getByTestId('push-alerts-panel');
    await expect(panel).toBeVisible({ timeout: 15_000 });
    // exact: evita strict mode (título + línea de diagnósticos "Alertas push: …")
    await expect(panel.getByText('Alertas push', { exact: true })).toBeVisible();

    const enable = panel.getByRole('button', { name: /activar alertas/i });
    const disable = panel.getByRole('button', { name: /desactivar alertas/i });
    const testPush = panel.getByRole('button', { name: /enviar prueba/i });
    const diagnostics = page.getByTestId('push-diagnostics');
    const unsupportedCopy = panel.getByText(
      /no soporta alertas push|aún no están disponibles|permiso está bloqueado/i,
    );

    await expect(enable.or(disable).or(diagnostics).or(unsupportedCopy).first()).toBeVisible({
      timeout: 15_000,
    });

    if (await enable.isVisible()) {
      await expect(enable).toBeEnabled();
    }
    if (await disable.isVisible()) {
      await expect(panel.getByText(/alertas activadas/i)).toBeVisible();
      await expect(testPush).toBeVisible();
    }

    // Diagnóstico demoted: solo si push no está listo o el permiso está bloqueado
    if (await diagnostics.isVisible()) {
      await expect(diagnostics).toContainText(/alertas push/i);
    }
  });

  test('Ajustes expone el mismo panel de alertas push', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/settings');
    await page.waitForURL(/\/settings/);

    const panel = page.getByTestId('push-alerts-panel');
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: /ver centro de alertas/i })).toBeVisible();
    await page.getByRole('link', { name: /ver centro de alertas/i }).click();
    await expect(page).toHaveURL(/\/notifications/);
    await expect(page.getByTestId('push-alerts-panel')).toBeVisible();
  });

  test('Ajustes expone usuarios silenciados', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/settings');
    await page.waitForURL(/\/settings/);

    const muted = page.getByTestId('muted-users-panel');
    await expect(muted).toBeVisible({ timeout: 15_000 });
    await expect(muted.getByText('Usuarios silenciados', { exact: true })).toBeVisible();
    await expect(
      muted.getByTestId('muted-users-empty').or(muted.getByRole('list', { name: /usuarios silenciados/i })),
    ).toBeVisible();
  });

  test('Ajustes expone usuarios bloqueados', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/settings');
    await page.waitForURL(/\/settings/);

    const blocked = page.getByTestId('blocked-users-panel');
    await expect(blocked).toBeVisible({ timeout: 15_000 });
    await expect(blocked.getByText('Usuarios bloqueados', { exact: true })).toBeVisible();
    await expect(
      blocked
        .getByTestId('blocked-users-empty')
        .or(blocked.getByRole('list', { name: /usuarios bloqueados/i })),
    ).toBeVisible();
  });

  test('Ajustes expone horario silencioso de push', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/settings');
    await page.waitForURL(/\/settings/);

    const quiet = page.getByTestId('push-quiet-hours-panel');
    await expect(quiet).toBeVisible({ timeout: 15_000 });
    await expect(quiet.getByText('Horario silencioso de push', { exact: true })).toBeVisible();
    await expect(
      quiet.getByRole('button', { name: /horario silencioso: (activado|desactivado)/i }),
    ).toBeVisible();
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
      page.getByLabel(/nuevo comentario/i).or(page.getByText(/sé el primero en comentar/i)).first(),
    ).toBeVisible();
  });
});
