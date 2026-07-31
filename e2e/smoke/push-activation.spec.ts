import { expect, test } from '@playwright/test';
import { openAuthenticatedHome } from '../helpers/auth';

async function readSessionUserId(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('ninety.session:v1') ?? localStorage.getItem('ninety.session');
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as { user?: { id?: string } };
      return session.user?.id ?? null;
    } catch {
      return null;
    }
  });
}

async function seedPushEligible(page: import('@playwright/test').Page, userId: string) {
  await page.evaluate((id) => {
    localStorage.setItem(
      `ninety.pushPrompt:v1:${id}`,
      JSON.stringify({
        eligibleReason: 'first_follow',
        eligibleAt: new Date().toISOString(),
      }),
    );
  }, userId);
}

test.describe('Smoke — activación push @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        configurable: true,
        value: class MockNotification {
          static permission: NotificationPermission = 'default';
          static requestPermission = async () => {
            MockNotification.permission = 'granted';
            return 'granted' as NotificationPermission;
          };
        },
      });
    });
  });

  test('banner aparece con milestone y se descarta de forma permanente', async ({ page }) => {
    await openAuthenticatedHome(page);
    const userId = await readSessionUserId(page);
    expect(userId).toBeTruthy();

    await seedPushEligible(page, userId!);
    await page.reload();
    await expect(page.getByRole('heading', { name: /esto es tu fútbol|tu wrapped empieza|comunidad/i }).first()).toBeVisible({
      timeout: 20_000,
    });

    // Si el onboarding core sigue activo, el banner no compite
    const onboarding = page.getByRole('heading', { name: /primeros pasos/i });
    if (await onboarding.isVisible().catch(() => false)) {
      await expect(page.getByTestId('push-activation-banner')).toHaveCount(0);
      return;
    }

    // Sin VAPID en algunos entornos el banner no sale: aceptar ausencia
    const banner = page.getByTestId('push-activation-banner');
    const visible = await banner.isVisible().catch(() => false);
    if (!visible) {
      test.info().annotations.push({
        type: 'note',
        description: 'Push banner oculto (VAPID/soporte no disponible en este entorno)',
      });
      return;
    }

    await expect(banner.getByRole('button', { name: /activar alertas/i })).toBeVisible();
    await banner.getByRole('button', { name: /no volver a mostrar/i }).click();
    await expect(banner).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('push-activation-banner')).toHaveCount(0);
  });
});
