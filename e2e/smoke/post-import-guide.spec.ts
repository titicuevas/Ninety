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

test.describe('Smoke — guía post-import @smoke', () => {
  test('card Diario restaurado guía a colecciones / feed / comparar', async ({ page }) => {
    await openAuthenticatedHome(page);
    const userId = await readSessionUserId(page);
    expect(userId).toBeTruthy();

    await page.evaluate((id) => {
      localStorage.setItem(
        `ninety.diaryPostImport:v1:${id}`,
        JSON.stringify({
          importedAt: new Date().toISOString(),
          importedCount: 4,
        }),
      );
      localStorage.setItem(
        `ninety.valueOnboarding:v1:${id}`,
        JSON.stringify({ dismissPermanent: true }),
      );
    }, userId!);

    await page.route('**/api/collections/me', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ collections: [] }),
      });
    });

    await page.reload();

    const onboardingCore = page.getByRole('heading', { name: /primeros pasos/i });
    if (await onboardingCore.isVisible().catch(() => false)) {
      test.info().annotations.push({
        type: 'note',
        description: 'Onboarding core aún activo — guía post-import no aplica',
      });
      return;
    }

    const card = page.getByTestId('post-import-guide-card');
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card.getByRole('heading', { name: /diario restaurado/i })).toBeVisible();
    await expect(card.getByText(/crea una colección/i)).toBeVisible();
    await expect(card.getByText(/mira el feed/i)).toBeVisible();
    await expect(card.getByText(/compara tu diario/i)).toBeVisible();

    await card.getByRole('link', { name: /crea una colección/i }).click();
    await expect(page).toHaveURL(/\/collections(\?new=1)?/);
    await expect(page.getByText(/acabas de restaurar/i)).toBeVisible({ timeout: 15_000 });
  });

  test('dismiss permanente oculta la guía post-import', async ({ page }) => {
    await openAuthenticatedHome(page);
    const userId = await readSessionUserId(page);
    expect(userId).toBeTruthy();

    await page.evaluate((id) => {
      localStorage.setItem(
        `ninety.diaryPostImport:v1:${id}`,
        JSON.stringify({
          importedAt: new Date().toISOString(),
          importedCount: 2,
        }),
      );
      localStorage.setItem(
        `ninety.valueOnboarding:v1:${id}`,
        JSON.stringify({ dismissPermanent: true }),
      );
    }, userId!);

    await page.reload();

    const onboardingCore = page.getByRole('heading', { name: /primeros pasos/i });
    if (await onboardingCore.isVisible().catch(() => false)) {
      test.info().annotations.push({
        type: 'note',
        description: 'Onboarding core aún activo — skip dismiss post-import',
      });
      return;
    }

    const card = page.getByTestId('post-import-guide-card');
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.getByRole('button', { name: /no volver a mostrar/i }).click();
    await expect(card).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('post-import-guide-card')).toHaveCount(0);
  });
});
