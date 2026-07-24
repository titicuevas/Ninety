import { expect, test } from '@playwright/test';

function requireDemoCredentials() {
  const email = process.env.TEST_USER_EMAIL ?? 'beta@ninety.app';
  const password = process.env.TEST_USER_PASSWORD;
  if (!password) {
    throw new Error(
      'Falta TEST_USER_PASSWORD en backend/.env para los E2E de Playwright.\n' +
        'Añádela y vuelve a ejecutar: npm run test:e2e',
    );
  }
  return { email, password };
}

async function loginAsDemo(page: import('@playwright/test').Page) {
  const { email, password } = requireDemoCredentials();
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /bienvenido de vuelta/i })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 20_000 });
}

test.describe('Ninety — E2E Playwright', () => {
  test('login demo y abre Wrapped', async ({ page }) => {
    await loginAsDemo(page);
    await expect(page.getByRole('heading', { name: /esto es tu fútbol/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('buscar aficionados responde en la UI', async ({ page }) => {
    await loginAsDemo(page);

    // Navegación client-side: un goto() recarga y ProtectedRoute puede
    // redirigir a /home mientras hidrata la sesión desde localStorage.
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /buscar/i })
      .click();
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByRole('heading', { name: /^buscar$/i })).toBeVisible();

    await page.getByRole('tab', { name: 'Aficionados' }).click();
    await expect(page).toHaveURL(/tab=people/);
    await expect(page.getByText(/encuentra aficionados/i)).toBeVisible();

    await page.getByLabel(/nombre o username/i).fill('zzzninetye2e');
    await expect(page.getByText(/sin resultados/i)).toBeVisible({ timeout: 20_000 });
  });

  test('API search de perfiles no falla con sesión', async ({ page, request }) => {
    await loginAsDemo(page);

    const token = await page.evaluate(() => {
      const raw =
        window.localStorage.getItem('ninety.session:v1') ??
        window.localStorage.getItem('ninety.session');
      if (!raw) return null;
      try {
        return (JSON.parse(raw) as { access_token?: string }).access_token ?? null;
      } catch {
        return null;
      }
    });

    expect(token).toBeTruthy();

    const apiBase = process.env.E2E_API_URL ?? 'http://localhost:3001';
    const res = await request.get(`${apiBase}/api/profile/search?q=be`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { profiles: unknown[] };
    expect(Array.isArray(body.profiles)).toBeTruthy();
  });

  test('perfil y capsule públicos sin login', async ({ page }) => {
    await page.goto('/u/beta_ninety');
    await expect(page.getByRole('heading', { name: /beta ninety/i })).toBeVisible({
      timeout: 20_000,
    });

    const firstMatch = page.locator('a[href^="/c/"]').first();
    await expect(firstMatch).toBeVisible({ timeout: 15_000 });
    await firstMatch.click();

    await expect(page).toHaveURL(/\/c\/[0-9a-f-]+/i);
    await expect(page.getByRole('button', { name: /compartir/i })).toBeVisible();
  });
});
