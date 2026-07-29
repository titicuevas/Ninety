import { expect, test } from '@playwright/test';

test.describe('Responsive shell desktop @critical', () => {
  test('usa nav de header y no tab bar inferior', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL(/\/home/);

    const nav = page.getByRole('navigation', { name: /navegación principal/i });
    await expect(nav).toHaveCount(1);

    const box = await nav.boundingBox();
    expect(box).toBeTruthy();
    // Header arriba
    expect(box!.y).toBeLessThan(120);

    await nav.getByRole('link', { name: /feed/i }).click();
    await expect(page).toHaveURL(/\/feed/);
  });
});
