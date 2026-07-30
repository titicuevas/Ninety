import { expect, test } from '@playwright/test';
import { API_BASE, DEMO_USERNAME } from '../helpers/auth';

test.describe('Smoke — público @smoke', () => {
  test('landing carga con marca Ninety', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /ninety/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /crear cuenta/i }).first()).toBeVisible();
  });

  test('login muestra formulario', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /bienvenido de vuelta/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
  });

  test('perfil público demo responde', async ({ page }) => {
    await page.goto(`/u/${DEMO_USERNAME}`);
    await expect(page.getByRole('heading', { name: /beta ninety/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('link', { name: /seguidores/i })).toBeVisible();
    await expect(page.getByText(/\d+ partidos? en su diario/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /compartir perfil/i })).toBeVisible();

    const wrapped = page.getByRole('heading', { name: /el fútbol de/i });
    const emptyDiary = page.getByText(/aún no ha publicado partidos/i);
    // Si el demo tiene Capsules públicas, debe verse el Wrapped público
    if (await wrapped.isVisible().catch(() => false)) {
      await expect(page.getByText(/wrapped público/i)).toBeVisible();
      await expect(page.getByLabel(/buscar en el diario público/i)).toBeVisible();
      await expect(page.getByRole('group', { name: /filtrar por valoración/i })).toBeVisible();
    } else {
      await expect(emptyDiary.or(page.locator('main'))).toBeVisible();
    }
  });

  test('OG del perfil público incluye metas para bots', async ({ request }) => {
    const site = (process.env.E2E_SITE_URL ?? 'https://ninety.up.railway.app').replace(/\/$/, '');
    const res = await request.get(`${site}/u/${DEMO_USERNAME}`, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1' },
    });
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toMatch(/property="og:title"/i);
    expect(html).toMatch(/property="og:description"/i);
    expect(html).toMatch(/property="og:image"/i);
    expect(html).toMatch(new RegExp(`/u/${DEMO_USERNAME}`, 'i'));
    expect(html).toMatch(/diario futbolero/i);
  });

  test('API perfil público acepta filtros y stats', async ({ request }) => {
    const res = await request.get(
      `${API_BASE}/api/capsules/user/${DEMO_USERNAME}?limit=5&offset=0&rating_min=4`,
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      profile?: { username?: string };
      capsules?: unknown[];
      total?: number;
      stats?: { totalMatches?: number };
      years?: number[];
    };
    expect(body.profile?.username).toBeTruthy();
    expect(Array.isArray(body.capsules)).toBe(true);
    expect(body.capsules!.length).toBeLessThanOrEqual(5);
    expect(typeof body.total).toBe('number');
    expect(body.stats).toBeTruthy();
    expect(typeof body.stats?.totalMatches).toBe('number');
    expect(Array.isArray(body.years)).toBe(true);
  });

  test('listas followers/following públicas no 401', async ({ request }) => {
    const followers = await request.get(`${API_BASE}/api/profile/${DEMO_USERNAME}/followers`);
    const following = await request.get(`${API_BASE}/api/profile/${DEMO_USERNAME}/following`);
    expect(followers.status()).not.toBe(401);
    expect(following.status()).not.toBe(401);
    expect(followers.ok()).toBeTruthy();
    expect(following.ok()).toBeTruthy();
  });

  test('API health', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { status?: string };
    expect(body.status).toBe('ok');
  });
});
