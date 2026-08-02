import { expect, test } from '@playwright/test';
import {
  API_BASE,
  DEMO_USERNAME,
  demoDisplayName,
  escapeRegExp,
  requirePublicDemoProfile,
} from '../helpers/auth';

test.describe('Smoke — público @smoke', () => {
  test('landing carga con marca Ninety', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /ninety/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /crear cuenta/i }).first()).toBeVisible();
  });

  test('login muestra formulario', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /bienvenido de vuelta/i })).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /olvidaste tu contraseña/i })).toBeVisible();
  });

  test('recuperar contraseña muestra formulario', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /recuperar contraseña/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: /enviar enlace/i })).toBeVisible();
  });

  test('reset password sin token muestra error de enlace', async ({ page }) => {
    await page.goto('/auth/reset-password');
    await expect(page.getByRole('heading', { name: /nueva contraseña/i })).toBeVisible();
    await expect(page.getByText(/enlace inválido o caducado/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /solicitar nuevo enlace/i })).toBeVisible();
  });

  test('reset password con error de Supabase muestra mensaje', async ({ page }) => {
    await page.goto('/auth/reset-password?error=access_denied&error_description=Link%20expired');
    await expect(page.getByRole('heading', { name: /nueva contraseña/i })).toBeVisible();
    await expect(page.getByText(/link expired/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /solicitar nuevo enlace/i })).toBeVisible();
  });

  test('perfil público demo responde', async ({ page, request }) => {
    const data = await requirePublicDemoProfile(request);
    const name = demoDisplayName(data);

    await page.goto(`/u/${DEMO_USERNAME}`);
    await expect(page.getByRole('heading', { name: new RegExp(escapeRegExp(name), 'i') })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('link', { name: /seguidores/i })).toBeVisible();
    await expect(page.getByText(/\d+ partidos? en su diario/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /compartir perfil/i })).toBeVisible();

    const wrapped = page.getByRole('heading', { name: /el fútbol de/i });
    const emptyDiary = page.getByText(/aún no ha publicado partidos/i);
    if (await wrapped.isVisible().catch(() => false)) {
      await expect(page.getByText(/wrapped público/i)).toBeVisible();
      const monthChart = page.getByLabel(/gráfico de partidos por mes/i);
      const bestRated = page.getByText(/mejor valorado/i);
      await expect(monthChart.or(bestRated).or(page.getByText(/media ★/i).first())).toBeVisible();
      await expect(page.getByLabel(/buscar en el diario público/i)).toBeVisible();
      await expect(page.getByRole('group', { name: /filtrar por valoración/i })).toBeVisible();
    } else {
      await expect(emptyDiary.or(page.locator('main'))).toBeVisible();
    }
  });

  test('OG del perfil público incluye metas para bots', async ({ request }) => {
    await requirePublicDemoProfile(request);
    const site = (process.env.E2E_SITE_URL ?? process.env.E2E_BASE_URL ?? 'https://ninety.up.railway.app').replace(
      /\/$/,
      '',
    );
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
    const body = await requirePublicDemoProfile(request, 'limit=5&offset=0&rating_min=4');
    expect(body.profile?.username).toBeTruthy();
    expect(Array.isArray(body.capsules)).toBe(true);
    expect(body.capsules!.length).toBeLessThanOrEqual(5);
    expect(typeof body.total).toBe('number');
    expect(body.stats).toBeTruthy();
    expect(typeof body.stats?.totalMatches).toBe('number');
    expect(Array.isArray(body.years)).toBe(true);
  });

  test('listas followers/following públicas no 401', async ({ request }) => {
    await requirePublicDemoProfile(request);
    const followers = await request.get(`${API_BASE}/api/profile/${DEMO_USERNAME}/followers`);
    const following = await request.get(`${API_BASE}/api/profile/${DEMO_USERNAME}/following`);
    expect(followers.status()).not.toBe(401);
    expect(following.status()).not.toBe(401);
    expect(followers.ok()).toBeTruthy();
    expect(following.ok()).toBeTruthy();
  });

  test('OG de Capsule pública incluye metas para bots', async ({ request }) => {
    const body = await requirePublicDemoProfile(request, 'limit=1&offset=0');
    const capsuleId = body.capsules?.[0]?.id;
    test.skip(!capsuleId, 'El usuario demo no tiene Capsules públicas');

    const site = (process.env.E2E_SITE_URL ?? process.env.E2E_BASE_URL ?? 'https://ninety.up.railway.app').replace(
      /\/$/,
      '',
    );
    const res = await request.get(`${site}/c/${capsuleId}`, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1' },
    });
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toMatch(/property="og:title"/i);
    expect(html).toMatch(/property="og:description"/i);
    expect(html).toMatch(/property="og:image"/i);
    expect(html).toMatch(new RegExp(`/c/${capsuleId}`, 'i'));
  });

  test('detalle Capsule pública muestra autor y CTA de seguir', async ({ page, request }) => {
    const body = await requirePublicDemoProfile(request, 'limit=1&offset=0');
    const capsuleId = body.capsules?.[0]?.id;
    test.skip(!capsuleId, 'El usuario demo no tiene Capsules públicas');

    const detail = await request.get(`${API_BASE}/api/capsules/${capsuleId}`);
    expect(detail.ok()).toBeTruthy();
    const capsule = (await detail.json()) as {
      profiles?: { username?: string | null; followed_by_me?: boolean; avatar_url?: string | null };
    };
    expect(capsule.profiles).toBeTruthy();
    expect(typeof capsule.profiles?.followed_by_me).toBe('boolean');

    await page.goto(`/c/${capsuleId}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /compartir capsule/i })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /inicia sesión para seguir/i }).or(
        page.getByRole('button', { name: /seguir|siguiendo/i }),
      ),
    ).toBeVisible();
  });

  test('API health', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { status?: string };
    expect(body.status).toBe('ok');
  });
});
