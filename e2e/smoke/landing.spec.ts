import { expect, test } from '@playwright/test';

test.describe('Smoke — landing y splash @smoke', () => {
  test('landing pública carga sin flash de contenido antiguo', async ({ page }) => {
    await page.goto('/');
    // El splash debe desaparecer antes de 4s tras el mount de React
    await expect(page.locator('#root > .ninety-splash')).toHaveCount(0, { timeout: 4_000 });
    // La landing renderiza el título principal
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 });
  });

  test('el logo SVG del campo aparece en el header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 });
    // El logo está en el header como SVG con viewBox del campo de fútbol
    const header = page.getByRole('banner');
    const logo = header.locator('svg[viewBox="0 0 512 512"]').first();
    await expect(logo).toBeVisible();
    // El SVG tiene el gradiente del campo (confirma que es el nuevo logo, no el anterior)
    const hasPitch = await logo.locator('rect, line, circle').count();
    expect(hasPitch).toBeGreaterThan(0);
  });

  test('favicon.svg referenciado en el head', async ({ page }) => {
    await page.goto('/');
    const favicon = await page.locator('link[rel="icon"][href="/favicon.svg"]').count();
    expect(favicon).toBeGreaterThan(0);
  });

  test('manifest.json accesible con los iconos correctos', async ({ request }) => {
    const res = await request.get('http://localhost:5173/manifest.json');
    expect(res.ok()).toBeTruthy();
    const manifest = (await res.json()) as { icons?: Array<{ src: string }> };
    const srcs = (manifest.icons ?? []).map((i) => i.src);
    expect(srcs).toContain('/icon-192.png');
    expect(srcs).toContain('/icon-512.png');
    expect(srcs).toContain('/favicon.svg');
  });

  for (const viewport of [
    { name: 'móvil', width: 390, height: 844 },
    { name: 'tablet vertical', width: 834, height: 1194 },
    { name: 'tablet horizontal', width: 1194, height: 834 },
  ]) {
    test(`landing adaptada a ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

      const fixedCta = page.locator('.fixed').getByRole('link', { name: /crear mi diario gratis/i });
      if (viewport.width < 640) {
        await expect(fixedCta).toBeVisible();
      } else {
        await expect(fixedCta).toBeHidden();
      }
    });
  }
});
