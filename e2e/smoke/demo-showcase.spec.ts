import { expect, test } from '@playwright/test';
import {
  API_BASE,
  DEMO_USERNAME,
  openAuthenticatedHome,
  readAccessToken,
} from '../helpers/auth';
import {
  DEMO_CAPSULE_SOCIAL_COUNT,
  DEMO_FEATURED_COLLECTION_SLUG,
  DEMO_SOCIAL_COMMENT_MARKER,
  requireDemoFeaturedCollection,
  requireDemoShowcaseProfile,
} from '../helpers/demoShowcase';

test.describe('Smoke — demo showcase @smoke', () => {
  test('API perfil demo: diario limpio, Favoritos y Capsule social', async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== 'smoke-public', 'API pública sin auth');
    await requireDemoShowcaseProfile(request);
    await requireDemoFeaturedCollection(request);
  });

  test('API Favoritos incluye comentario sembrado', async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== 'smoke-public', 'API pública sin auth');
    const { collection } = await requireDemoFeaturedCollection(request);
    expect(collection?.id).toBeTruthy();

    const comments = await request.get(`${API_BASE}/api/collections/${collection!.id}/comments`);
    expect(comments.ok()).toBeTruthy();
    const body = (await comments.json()) as { comments?: Array<{ body?: string }> };
    expect(
      body.comments?.some((row) => (row.body ?? '').includes(DEMO_SOCIAL_COMMENT_MARKER)),
      'ejecuta npm run seed:fans para comentarios en Favoritos',
    ).toBe(true);
  });

  test('Favoritos invitado muestra me gusta y comentarios públicos', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'smoke-public', 'vista invitado');
    await requireDemoFeaturedCollection(request);

    await page.goto(`/u/${DEMO_USERNAME}/lists/${DEMO_FEATURED_COLLECTION_SLUG}`);
    await expect(page.getByRole('heading', { name: /^favoritos$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: /\d+ me gusta/i })).toBeVisible();
    await expect(page.getByText(/partidos que no me canso de revivir/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /ocultar comentarios/i })).toBeVisible();
    await expect(page.getByText(new RegExp(DEMO_SOCIAL_COMMENT_MARKER, 'i'))).toBeVisible({
      timeout: 15_000,
    });
  });

  test('Capsule social invitado muestra reseña y engagement', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'smoke-public', 'vista invitado');
    const { socialCapsule } = await requireDemoShowcaseProfile(request);
    const note = (socialCapsule.note ?? '').trim();
    expect(note.length).toBeGreaterThan(0);

    await page.goto(`/c/${socialCapsule.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(note)).toBeVisible();
    await expect(page.getByText(/\d+ me gusta/i).first()).toBeVisible();
    await expect(page.getByText(/\d+ comentarios?/i).first()).toBeVisible();
  });

  test('perfil público invitado muestra engagement en el diario', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'smoke-public', 'vista invitado');
    const { socialCapsule } = await requireDemoShowcaseProfile(request);
    const note = (socialCapsule.note ?? '').trim();
    expect(note.length).toBeGreaterThan(0);

    await page.goto(`/u/${DEMO_USERNAME}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(note)).toBeVisible();
    await expect(page.getByRole('button', { name: /\d+ me gusta/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /\d+ me gusta/i })).toHaveCount(
      DEMO_CAPSULE_SOCIAL_COUNT,
    );
    await expect(page.getByText(/\d+ comentarios?/i).first()).toBeVisible();

    const featured = page.getByRole('region', { name: /colección destacada/i });
    await expect(featured.getByText(/\d+ me gusta/i)).toBeVisible();
    await expect(featured.getByText(/\d+ comentarios?/i)).toBeVisible();
  });

  test('diario público demo autenticado muestra también le gusta y comentó', async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await requireDemoShowcaseProfile(request);
    await openAuthenticatedHome(page);
    await page.goto(`/u/${DEMO_USERNAME}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/también le gusta/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/también comentó/i).first()).toBeVisible();
    const featured = page.getByRole('region', { name: /colección destacada/i });
    await expect(featured.getByText(/también le gusta/i)).toBeVisible();
    await expect(featured.getByText(/también comentó/i)).toBeVisible();
  });

  test('feed Siguiendo muestra también le gusta de follows', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(
      `${API_BASE}/api/capsules/feed?scope=following&sort=recent&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      capsules?: Array<{ likes_count?: number; comments_count?: number }>;
    };
    const social = (body.capsules ?? []).find(
      (row) => (row.likes_count ?? 0) > 0 || (row.comments_count ?? 0) > 0,
    );
    test.skip(!social, 'Ejecuta npm run seed:fans — el feed Siguiendo no tiene Capsules con likes/comentarios');

    await page.goto('/feed');
    await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/también le gusta|también comentó/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Actividad QA incluye eventos sociales del seed demo', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/activity?limit=30`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { events?: Array<{ type?: string }> };
    const types = new Set((body.events ?? []).map((event) => event.type));
    expect(types.has('capsule_like'), 'seed:fans — likes en Capsules de follows').toBe(true);
    expect(types.has('capsule_comment'), 'seed:fans — comentarios en Capsules').toBe(true);
    expect(types.has('collection_like'), 'seed:fans — likes en Favoritos').toBe(true);
    expect(types.has('collection_comment'), 'seed:fans — comentarios en Favoritos').toBe(true);
  });

  test('Actividad UI muestra filtros y eventos cuando hay follows', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    await page.goto('/activity');
    await expect(page.getByRole('heading', { name: /^actividad$/i })).toBeVisible({
      timeout: 15_000,
    });

    const emptyNoFollows = page.getByText(/todavía no sigues a nadie/i);
    if (await emptyNoFollows.isVisible().catch(() => false)) {
      test.skip(true, 'La cuenta QA no sigue a nadie — ejecuta seed:fans');
      return;
    }

    await expect(page.getByTestId('activity-type-filters')).toBeVisible({ timeout: 10_000 });
    const eventRow = page.locator('[data-testid="activity-event"], main ul li, main article').first();
    await expect(eventRow).toBeVisible({ timeout: 15_000 });
  });
});
