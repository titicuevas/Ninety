import { expect, test } from '@playwright/test';
import {
  API_BASE,
  DEMO_USERNAME,
  openAuthenticatedHome,
  readAccessToken,
} from '../helpers/auth';
import {
  ALSO_WATCHED_UI,
  DEMO_CAPSULE_SOCIAL_COUNT,
  DEMO_COMPARE_FAN_USERNAME,
  DEMO_FEATURED_COLLECTION_SLUG,
  DEMO_SOCIAL_COMMENT_MARKER,
  hasAlsoWatchedPeople,
  hasAlsoLikedPeople,
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

  test('Favoritos autenticado muestra pie social en los partidos', async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    const { capsules } = await requireDemoFeaturedCollection(request);
    const socialItem = (
      (capsules ?? []) as Array<{ likes_count?: number; comments_count?: number }>
    ).find((row) => (row.likes_count ?? 0) > 0 || (row.comments_count ?? 0) > 0);
    expect(
      socialItem,
      'GET Favoritos debe incluir likes/comentarios en un partido. Ejecuta npm run seed:fans.',
    ).toBeTruthy();

    await openAuthenticatedHome(page);
    await page.goto(`/u/${DEMO_USERNAME}/lists/${DEMO_FEATURED_COLLECTION_SLUG}`);
    await expect(page.getByRole('heading', { name: /^favoritos$/i })).toBeVisible({
      timeout: 20_000,
    });
    const items = page.getByRole('list').filter({ has: page.getByText(/ vs /i) });
    await expect(
      items.getByText(/también le gusta|también comentó|\d+ me gusta|\d+ comentarios?/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('detalle de lista autenticado muestra comentarios en la ficha', async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/collections/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      collections?: Array<{ id?: string; comments_count?: number; is_public?: boolean }>;
    };
    const social = (body.collections ?? []).find(
      (row) => row.id && row.is_public !== false && (row.comments_count ?? 0) > 0,
    );
    expect(
      social?.id,
      'La cuenta QA no tiene una lista pública con comentarios (usa @beta_ninety o seed:fans)',
    ).toBeTruthy();

    const detail = await request.get(`${API_BASE}/api/collections/${social!.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detail.ok()).toBeTruthy();
    const detailBody = (await detail.json()) as {
      collection?: { comments_count?: number };
      capsules?: Array<{ likes_count?: number; comments_count?: number }>;
    };
    expect(
      detailBody.collection?.comments_count ?? 0,
      'GET /api/collections/:id debe incluir comments_count',
    ).toBeGreaterThan(0);
    expect(
      (detailBody.capsules ?? []).some(
        (row) => (row.likes_count ?? 0) > 0 || (row.comments_count ?? 0) > 0,
      ),
      'GET /api/collections/:id debe incluir likes/comentarios en los partidos',
    ).toBeTruthy();

    await page.goto(`/collections/${social!.id}`);
    await expect(page.getByRole('heading', { name: /editar colección/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/\d+ comentarios?/i).first()).toBeVisible();
    await expect(page.getByText(/también le gusta|también comentó/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page
        .getByTestId('collection-items')
        .getByText(/también le gusta|también comentó|\d+ me gusta|\d+ comentarios?/i)
        .first(),
    ).toBeVisible({ timeout: 15_000 });
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
    const lists = page.getByRole('region', { name: /^colecciones$/i });
    await expect(lists.getByText(/\d+ comentarios?/i).first()).toBeVisible();
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
    const lists = page.getByRole('region', { name: /^colecciones$/i });
    await expect(lists.getByText(/también le gusta/i)).toBeVisible();
    await expect(lists.getByText(/también comentó/i)).toBeVisible();
  });

  test('diario público autenticado muestra también lo vieron', async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(
      `${API_BASE}/api/capsules/user/${encodeURIComponent(DEMO_USERNAME)}?limit=20&offset=0`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      capsules?: Array<{ also_watched?: unknown[] }>;
    };
    expect(
      (body.capsules ?? []).some(hasAlsoWatchedPeople),
      'Ejecuta npm run seed:fans — el diario demo no tiene follows que vieran el mismo partido',
    ).toBe(true);

    await page.goto(`/u/${DEMO_USERNAME}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(ALSO_WATCHED_UI).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('calendario público autenticado muestra pie social en el día', async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    const { socialCapsule } = await requireDemoShowcaseProfile(request);
    const day = (socialCapsule.watched_at ?? '').slice(0, 10);
    expect(day, 'La Capsule social del demo necesita watched_at').toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const [year, month] = day.split('-');

    await openAuthenticatedHome(page);
    await page.goto(`/u/${DEMO_USERNAME}/calendar/${year}/${Number(month)}?day=${day}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/también le gusta|también comentó|\d+ me gusta|\d+ comentarios?/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(ALSO_WATCHED_UI).first()).toBeVisible({ timeout: 15_000 });
  });

  test('calendario propio muestra pie social en el día', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    const { socialCapsule } = await requireDemoShowcaseProfile(request);
    const day = (socialCapsule.watched_at ?? '').slice(0, 10);
    expect(day, 'La Capsule social del demo necesita watched_at').toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const [year, month] = day.split('-');

    await openAuthenticatedHome(page);
    await page.goto(`/diary/calendar?year=${year}&month=${Number(month)}&day=${day}`);
    await expect(page.getByRole('heading', { name: /calendario/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText(/también le gusta|también comentó|\d+ me gusta|\d+ comentarios?/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(ALSO_WATCHED_UI).first()).toBeVisible({ timeout: 15_000 });
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
    expect(social, 'Ejecuta npm run seed:fans — el feed Siguiendo no tiene Capsules con likes/comentarios').toBeTruthy();

    await page.goto('/feed');
    await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/también le gusta|también comentó/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Mis me gusta muestra también le gusta de follows', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const feed = await request.get(
      `${API_BASE}/api/capsules/feed?scope=following&sort=recent&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(feed.ok()).toBeTruthy();
    const feedBody = (await feed.json()) as {
      capsules?: Array<{ id?: string; likes_count?: number }>;
    };
    const target = (feedBody.capsules ?? []).find((row) => (row.likes_count ?? 0) > 0 && row.id);
    expect(target?.id, 'Ejecuta npm run seed:fans — el feed no tiene Capsules con me gusta').toBeTruthy();

    const like = await request.post(`${API_BASE}/api/capsules/${target!.id}/like`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([201, 409]).toContain(like.status());
    const createdLike = like.status() === 201;

    try {
      await page.goto('/likes');
      await expect(page.getByRole('heading', { name: /^me gusta$/i })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText(/también le gusta/i).first()).toBeVisible({ timeout: 15_000 });
    } finally {
      if (createdLike) {
        await request.delete(`${API_BASE}/api/capsules/${target!.id}/like`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
  });

  test('Mis Capsules muestra también le gusta cuando hay engagement', async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const me = await request.get(`${API_BASE}/api/capsules/me?limit=20&offset=0`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok()).toBeTruthy();
    const body = (await me.json()) as {
      capsules?: Array<{ likes_count?: number; comments_count?: number }>;
    };
    const social = (body.capsules ?? []).find(
      (row) => (row.likes_count ?? 0) > 0 || (row.comments_count ?? 0) > 0,
    );
    expect(
      social,
      'La cuenta QA no tiene Capsules con likes/comentarios (usa @beta_ninety o seed:fans)',
    ).toBeTruthy();

    await page.goto('/capsules');
    await expect(page.getByRole('heading', { name: /mis capsules/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/también le gusta|también comentó/i).first()).toBeVisible({
      timeout: 15_000,
    });
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
    const body = (await res.json()) as {
      events?: Array<{
        type?: string;
        capsule?: { likes_count?: number; comments_count?: number };
        collection?: { likes_count?: number; comments_count?: number };
      }>;
    };
    const types = new Set((body.events ?? []).map((event) => event.type));
    expect(types.has('capsule_like'), 'seed:fans — likes en Capsules de follows').toBe(true);
    expect(types.has('capsule_comment'), 'seed:fans — comentarios en Capsules').toBe(true);
    expect(types.has('collection_like'), 'seed:fans — likes en Favoritos').toBe(true);
    expect(types.has('collection_comment'), 'seed:fans — comentarios en Favoritos').toBe(true);
    expect(
      (body.events ?? []).some(
        (event) =>
          (event.capsule?.likes_count ?? 0) > 0 ||
          (event.capsule?.comments_count ?? 0) > 0 ||
          (event.collection?.likes_count ?? 0) > 0 ||
          (event.collection?.comments_count ?? 0) > 0,
      ),
      'GET /api/activity debe incluir likes/comentarios en Capsules o listas',
    ).toBe(true);
  });

  test('Actividad UI muestra filtros y eventos cuando hay follows', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    await page.goto('/activity');
    await expect(page.getByRole('heading', { name: /^actividad$/i })).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByText(/todavía no sigues a nadie/i)).toHaveCount(0);

    await expect(page.getByTestId('activity-type-filters')).toBeVisible({ timeout: 10_000 });
    const eventRow = page.locator('[data-testid="activity-event"], main ul li, main article').first();
    await expect(eventRow).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/\d+ me gusta|\d+ comentarios?/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('Actividad filtra Me gusta', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/activity?limit=20&type=like`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(res.status() === 400, 'API aún no acepta type=like — espera al deploy de v66');
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { events?: Array<{ type?: string }> };
    const events = body.events ?? [];
    expect(events.length, 'GET /api/activity?type=like debe traer me gusta — ejecuta npm run seed:fans').toBeGreaterThan(0);
    expect(
      events.every((event) => event.type === 'capsule_like' || event.type === 'collection_like'),
      'type=like solo debe devolver capsule_like o collection_like',
    ).toBe(true);

    await page.goto('/activity?type=like');
    const likeChip = page.getByRole('button', { name: /^me gusta$/i });
    test.skip((await likeChip.count()) === 0, 'front aún no tiene chip Me gusta — espera al deploy de v66');
    await expect(likeChip).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/le dio me gusta/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('Actividad muestra También lo vieron del seed', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/activity?limit=30`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      events?: Array<{ capsule?: { also_watched?: unknown[] } }>;
    };
    expect(
      (body.events ?? []).some((event) => hasAlsoWatchedPeople(event.capsule ?? {})),
      'GET /api/activity debe incluir also_watched — ejecuta npm run seed:fans',
    ).toBe(true);

    await page.goto('/activity');
    await expect(page.getByRole('heading', { name: /^actividad$/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(ALSO_WATCHED_UI).first()).toBeVisible({ timeout: 15_000 });
  });

  test('Actividad muestra También le gusta del seed', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/activity?limit=30`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      events?: Array<{
        capsule?: { also_liked?: unknown[] };
        collection?: { also_liked?: unknown[] };
      }>;
    };
    const withCapsule = (body.events ?? []).find((event) => event.capsule);
    test.skip(
      withCapsule?.capsule != null && !('also_liked' in withCapsule.capsule),
      'API aún no devuelve also_liked en actividad — espera al deploy de v65',
    );
    expect(
      (body.events ?? []).some(
        (event) =>
          hasAlsoLikedPeople(event.capsule ?? {}) || hasAlsoLikedPeople(event.collection ?? {}),
      ),
      'GET /api/activity debe incluir also_liked — ejecuta npm run seed:fans',
    ).toBe(true);

    await page.goto('/activity');
    await expect(page.getByRole('heading', { name: /^actividad$/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/también le gusta|también les gusta/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('Home Actividad reciente muestra likes o comentarios', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/activity?limit=30`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      events?: Array<{
        capsule?: { likes_count?: number; comments_count?: number };
        collection?: { likes_count?: number; comments_count?: number };
      }>;
    };
    expect(
      (body.events ?? []).some(
        (event) =>
          (event.capsule?.likes_count ?? 0) > 0 ||
          (event.capsule?.comments_count ?? 0) > 0 ||
          (event.collection?.likes_count ?? 0) > 0 ||
          (event.collection?.comments_count ?? 0) > 0,
      ),
      'GET /api/activity debe incluir likes/comentarios — ejecuta npm run seed:fans',
    ).toBe(true);

    await page.goto('/home');
    const recent = page.getByRole('region', { name: /actividad reciente/i });
    await expect(recent).toBeVisible({ timeout: 20_000 });
    await expect(recent.getByText(/\d+ me gusta|\d+ comentarios?/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('Home Actividad reciente muestra También lo vieron', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/activity?limit=30`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      events?: Array<{ capsule?: { also_watched?: unknown[] } }>;
    };
    expect(
      (body.events ?? []).some((event) => hasAlsoWatchedPeople(event.capsule ?? {})),
      'GET /api/activity debe incluir also_watched — ejecuta npm run seed:fans',
    ).toBe(true);

    await page.goto('/home');
    const recent = page.getByRole('region', { name: /actividad reciente/i });
    await expect(recent).toBeVisible({ timeout: 20_000 });
    await expect(recent.getByText(ALSO_WATCHED_UI).first()).toBeVisible({ timeout: 15_000 });
  });

  test('Home Actividad reciente muestra También le gusta', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/activity?limit=30`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      events?: Array<{
        capsule?: { also_liked?: unknown[] };
        collection?: { also_liked?: unknown[] };
      }>;
    };
    const withCapsule = (body.events ?? []).find((event) => event.capsule);
    test.skip(
      withCapsule?.capsule != null && !('also_liked' in withCapsule.capsule),
      'API aún no devuelve also_liked en actividad — espera al deploy de v65',
    );
    expect(
      (body.events ?? []).some(
        (event) =>
          hasAlsoLikedPeople(event.capsule ?? {}) || hasAlsoLikedPeople(event.collection ?? {}),
      ),
      'GET /api/activity debe incluir also_liked — ejecuta npm run seed:fans',
    ).toBe(true);

    await page.goto('/home');
    const recent = page.getByRole('region', { name: /actividad reciente/i });
    await expect(recent).toBeVisible({ timeout: 20_000 });
    await expect(recent.getByText(/también le gusta|también les gusta/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('Explorar colecciones muestra también le gusta de follows', async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/collections/discover?limit=24`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      collections?: Array<{ likes_count?: number; comments_count?: number }>;
    };
    const social = (body.collections ?? []).find(
      (row) => (row.likes_count ?? 0) > 0 || (row.comments_count ?? 0) > 0,
    );
    expect(social, 'Ejecuta npm run seed:fans — Explorar no tiene listas con likes/comentarios').toBeTruthy();

    await page.goto('/collections/explore');
    await expect(page.getByRole('heading', { name: /explorar colecciones/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText(/también le gusta|también comentó/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Mis listas muestra también le gusta cuando hay engagement', async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/collections/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      collections?: Array<{ likes_count?: number; comments_count?: number; is_public?: boolean }>;
    };
    const social = (body.collections ?? []).find(
      (row) =>
        row.is_public !== false &&
        ((row.likes_count ?? 0) > 0 || (row.comments_count ?? 0) > 0),
    );
    expect(
      social,
      'La cuenta QA no tiene listas públicas con likes/comentarios (usa @beta_ninety o seed:fans)',
    ).toBeTruthy();

    await page.goto('/collections');
    await expect(page.getByRole('heading', { name: /^mis listas$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText(/también le gusta|también comentó/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('PATCH de lista conserva likes y comentarios', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const me = await request.get(`${API_BASE}/api/collections/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok()).toBeTruthy();
    const body = (await me.json()) as {
      collections?: Array<{
        id?: string;
        description?: string | null;
        likes_count?: number;
        comments_count?: number;
        is_public?: boolean;
      }>;
    };
    const target = (body.collections ?? []).find(
      (row) =>
        row.id &&
        row.is_public !== false &&
        ((row.likes_count ?? 0) > 0 || (row.comments_count ?? 0) > 0),
    );
    expect(
      target?.id,
      'La cuenta QA no tiene listas públicas con likes/comentarios (usa @beta_ninety o seed:fans)',
    ).toBeTruthy();

    const patch = await request.patch(`${API_BASE}/api/collections/${target!.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { description: target!.description ?? null },
    });
    expect(patch.ok()).toBeTruthy();
    const patched = (await patch.json()) as {
      collection?: { likes_count?: number; comments_count?: number };
    };
    expect(patched.collection?.likes_count ?? 0).toBe(target!.likes_count ?? 0);
    expect(patched.collection?.comments_count ?? 0).toBe(target!.comments_count ?? 0);
  });

  test('PATCH de Capsule conserva likes y comentarios', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const me = await request.get(`${API_BASE}/api/capsules/me?limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok()).toBeTruthy();
    const body = (await me.json()) as {
      capsules?: Array<{
        id?: string;
        note?: string | null;
        likes_count?: number;
        comments_count?: number;
        also_watched?: unknown[];
      }>;
    };
    const target = (body.capsules ?? []).find(
      (row) =>
        row.id &&
        ((row.likes_count ?? 0) > 0 ||
          (row.comments_count ?? 0) > 0 ||
          hasAlsoWatchedPeople(row)),
    );
    expect(
      target?.id,
      'La cuenta QA no tiene Capsules con likes/comentarios/also_watched (usa @beta_ninety o seed:fans)',
    ).toBeTruthy();

    const patch = await request.patch(`${API_BASE}/api/capsules/${target!.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { note: target!.note ?? null },
    });
    expect(patch.ok()).toBeTruthy();
    const patched = (await patch.json()) as {
      likes_count?: number;
      comments_count?: number;
      also_watched?: unknown[];
    };
    test.skip(
      !('likes_count' in patched),
      'API aún no devuelve likes_count en PATCH — espera al deploy de v60',
    );
    expect(patched.likes_count ?? 0).toBe(target!.likes_count ?? 0);
    expect(patched.comments_count ?? 0).toBe(target!.comments_count ?? 0);
    expect(patched.also_watched?.length ?? 0).toBe(target!.also_watched?.length ?? 0);
  });

  test('GET Capsule incluye also_watched', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const me = await request.get(`${API_BASE}/api/capsules/me?limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok()).toBeTruthy();
    const body = (await me.json()) as {
      capsules?: Array<{ id?: string; also_watched?: unknown[] }>;
    };
    const target = (body.capsules ?? []).find((row) => row.id && hasAlsoWatchedPeople(row));
    expect(
      target?.id,
      'La cuenta QA no tiene Capsules con also_watched (usa @beta_ninety o seed:fans)',
    ).toBeTruthy();

    const detail = await request.get(`${API_BASE}/api/capsules/${target!.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detail.ok()).toBeTruthy();
    const capsule = (await detail.json()) as { also_watched?: unknown[] };
    test.skip(
      !('also_watched' in capsule),
      'API aún no devuelve also_watched en GET — espera al deploy de v62',
    );
    expect(capsule.also_watched?.length ?? 0).toBeGreaterThan(0);
  });

  test('GET feed incluye also_liked de follows', async ({ page, request }, testInfo) => {
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
      capsules?: Array<{ id?: string; also_liked?: unknown[]; likes_count?: number }>;
    };
    const withLikes = (body.capsules ?? []).find((row) => row.id && (row.likes_count ?? 0) > 0);
    expect(
      withLikes?.id,
      'Ejecuta npm run seed:fans — el feed no tiene Capsules con me gusta',
    ).toBeTruthy();
    test.skip(
      withLikes != null && !('also_liked' in withLikes),
      'API aún no devuelve also_liked en el feed — espera al deploy de v63',
    );
    expect(
      (body.capsules ?? []).some(hasAlsoLikedPeople),
      'GET /api/capsules/feed debe incluir also_liked — ejecuta npm run seed:fans',
    ).toBe(true);
  });

  test('GET Mis listas incluye also_liked de follows', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/collections/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      collections?: Array<{ id?: string; also_liked?: unknown[]; likes_count?: number }>;
    };
    const withLikes = (body.collections ?? []).find((row) => row.id && (row.likes_count ?? 0) > 0);
    expect(
      withLikes?.id,
      'La cuenta QA no tiene listas con me gusta (usa @beta_ninety o seed:fans)',
    ).toBeTruthy();
    test.skip(
      withLikes != null && !('also_liked' in withLikes),
      'API aún no devuelve also_liked en listas — espera al deploy de v64',
    );
    expect(
      (body.collections ?? []).some(hasAlsoLikedPeople),
      'GET /api/collections/me debe incluir also_liked — ejecuta npm run seed:fans',
    ).toBe(true);
  });

  test('Home Comunidad muestra también le gusta en el preview del feed', async ({
    page,
    request,
  }, testInfo) => {
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
    expect(
      social,
      'Ejecuta npm run seed:fans — el preview de Home no tiene Capsules con likes/comentarios',
    ).toBeTruthy();

    await page.goto('/home');
    const hub = page.getByRole('region', { name: /^comunidad$/i });
    await expect(hub).toBeVisible({ timeout: 20_000 });
    await expect(
      hub.getByText(/también le gusta|también comentó/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('feed Siguiendo muestra también lo vieron', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(
      `${API_BASE}/api/capsules/feed?scope=following&sort=recent&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { capsules?: Array<{ also_watched?: unknown[] }> };
    expect(
      (body.capsules ?? []).some(hasAlsoWatchedPeople),
      'Ejecuta npm run seed:fans — el feed no tiene Capsules con también lo vieron',
    ).toBe(true);

    await page.goto('/feed');
    await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(ALSO_WATCHED_UI).first()).toBeVisible({ timeout: 15_000 });
  });

  test('Mis Capsules muestra también lo vieron', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/capsules/me?limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { capsules?: Array<{ also_watched?: unknown[] }> };
    expect(
      (body.capsules ?? []).some(hasAlsoWatchedPeople),
      'Ejecuta npm run seed:fans — Mis Capsules no tiene también lo vieron',
    ).toBe(true);

    await page.goto('/capsules');
    await expect(page.getByRole('heading', { name: /mis capsules/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(ALSO_WATCHED_UI).first()).toBeVisible({ timeout: 15_000 });
  });

  test('Mis me gusta muestra también lo vieron', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/capsules/me/liked?limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { capsules?: Array<{ also_watched?: unknown[] }> };
    expect(
      (body.capsules ?? []).some(hasAlsoWatchedPeople),
      'Ejecuta npm run seed:fans — Mis me gusta no tiene Capsules con también lo vieron',
    ).toBe(true);

    await page.goto('/likes');
    await expect(page.getByRole('heading', { name: /^me gusta$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(ALSO_WATCHED_UI).first()).toBeVisible({ timeout: 15_000 });
  });

  test('Favoritos autenticado muestra también lo vieron en los partidos', async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(
      `${API_BASE}/api/collections/user/${encodeURIComponent(DEMO_USERNAME)}/${DEMO_FEATURED_COLLECTION_SLUG}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { capsules?: Array<{ also_watched?: unknown[] }> };
    expect(
      (body.capsules ?? []).some(hasAlsoWatchedPeople),
      'Ejecuta npm run seed:fans — Favoritos no tiene partidos con también lo vieron',
    ).toBe(true);

    await page.goto(`/u/${DEMO_USERNAME}/lists/${DEMO_FEATURED_COLLECTION_SLUG}`);
    await expect(page.getByRole('heading', { name: /^favoritos$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(ALSO_WATCHED_UI).first()).toBeVisible({ timeout: 15_000 });
  });

  test('detalle de lista propio muestra también lo vieron en los partidos', async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const me = await request.get(`${API_BASE}/api/collections/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok()).toBeTruthy();
    const listBody = (await me.json()) as {
      collections?: Array<{ id?: string; slug?: string; is_public?: boolean }>;
    };
    const favoritos = (listBody.collections ?? []).find(
      (row) => row.id && row.slug === DEMO_FEATURED_COLLECTION_SLUG && row.is_public !== false,
    );
    expect(favoritos?.id, 'La cuenta QA no tiene la lista Favoritos (seed:fans)').toBeTruthy();

    const detail = await request.get(`${API_BASE}/api/collections/${favoritos!.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detail.ok()).toBeTruthy();
    const detailBody = (await detail.json()) as { capsules?: Array<{ also_watched?: unknown[] }> };
    expect(
      (detailBody.capsules ?? []).some(hasAlsoWatchedPeople),
      'GET /api/collections/:id debe incluir also_watched en los partidos',
    ).toBe(true);

    await page.goto(`/collections/${favoritos!.id}`);
    await expect(page.getByRole('heading', { name: /editar colección/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(ALSO_WATCHED_UI).first()).toBeVisible({ timeout: 15_000 });
  });

  test('Home Comunidad muestra también lo vieron en el preview del feed', async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(
      `${API_BASE}/api/capsules/feed?scope=following&sort=recent&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { capsules?: Array<{ also_watched?: unknown[] }> };
    expect(
      (body.capsules ?? []).some(hasAlsoWatchedPeople),
      'Ejecuta npm run seed:fans — el preview de Home no tiene también lo vieron',
    ).toBe(true);

    await page.goto('/home');
    const hub = page.getByRole('region', { name: /^comunidad$/i });
    await expect(hub).toBeVisible({ timeout: 20_000 });
    await expect(hub.getByText(ALSO_WATCHED_UI).first()).toBeVisible({ timeout: 15_000 });
  });

  test('Cara a cara muestra partidos en común del seed', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'requiere sesión QA');
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(
      `${API_BASE}/api/capsules/user/${encodeURIComponent(DEMO_COMPARE_FAN_USERNAME)}/in-common`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    test.skip(res.status() === 404, 'API aún no tiene in-common — espera al deploy de v67');
    expect(
      res.ok(),
      `Ejecuta npm run seed:fans — no se pudo cruzar con @${DEMO_COMPARE_FAN_USERNAME}`,
    ).toBeTruthy();
    const body = (await res.json()) as { matches?: unknown[]; total?: number };
    expect(
      (body.total ?? body.matches?.length ?? 0) > 0,
      `GET in-common debe cruzar con @${DEMO_COMPARE_FAN_USERNAME} — ejecuta npm run seed:fans`,
    ).toBe(true);

    await page.goto(`/u/${encodeURIComponent(DEMO_COMPARE_FAN_USERNAME)}/vs`);
    const section = page.getByTestId('compare-in-common');
    test.skip(
      (await section.count()) === 0,
      'front aún no pinta partidos en común — espera al deploy de v67',
    );
    await expect(section).toBeVisible({ timeout: 15_000 });
    await expect(section.getByRole('link').first()).toBeVisible({ timeout: 10_000 });
  });
});
