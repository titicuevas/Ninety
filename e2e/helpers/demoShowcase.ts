import { expect, type APIRequestContext } from '@playwright/test';
import { API_BASE, DEMO_USERNAME, requirePublicDemoProfile } from './auth';
import { isE2eLeftoverNote } from './e2eCapsuleNotes';

/** Fan sembrado por `seed:fans` que comparte partidos con el demo (cara a cara). */
export const DEMO_COMPARE_FAN_USERNAME = 'maria_betica';

/** Lista destacada sembrada por `npm run seed:fans`. */
export const DEMO_FEATURED_COLLECTION_SLUG = 'favoritos-seed';

/** Cuántas Capsules del diario demo deben tener likes y comentarios (`seed:fans`). */
export const DEMO_CAPSULE_SOCIAL_COUNT = 3;

/** Marcador en comentarios sembrados — idempotente al re-ejecutar seed:fans. */
export const DEMO_SOCIAL_COMMENT_MARKER = 'ninety-seed';

/** Línea «También lo vio / vieron» en tarjetas (sesión QA). */
export const ALSO_WATCHED_UI = /también lo vieron|también lo vio/i;

export function hasAlsoWatchedPeople(row: { also_watched?: unknown[] | null }): boolean {
  return (row.also_watched?.length ?? 0) > 0;
}

export function hasAlsoLikedPeople(row: { also_liked?: unknown[] | null }): boolean {
  return (row.also_liked?.length ?? 0) > 0;
}

export function hasAlsoWantToGoPeople(row: { also_want_to_go?: unknown[] | null }): boolean {
  return (row.also_want_to_go?.length ?? 0) > 0;
}

export type DemoCapsuleRow = {
  id?: string;
  note?: string | null;
  likes_count?: number;
  comments_count?: number;
  home_team_name?: string;
  away_team_name?: string;
  watched_at?: string | null;
};

/** Perfil demo con diario limpio, Favoritos y Capsules con vida social (`seed:fans`). */
export async function requireDemoShowcaseProfile(
  request: APIRequestContext,
  query = 'limit=20&offset=0',
) {
  const body = await requirePublicDemoProfile(request, query);
  const capsules = (body.capsules ?? []) as DemoCapsuleRow[];
  const socialCapsules = capsules.filter(
    (row) => (row.likes_count ?? 0) > 0 && (row.comments_count ?? 0) > 0,
  );
  const notesClean =
    capsules.length >= 5 &&
    capsules.every(
      (row) => (row.note ?? '').trim().length > 0 && !isE2eLeftoverNote(row.note),
    );
  const featuredReady =
    body.featured_collection?.slug === DEMO_FEATURED_COLLECTION_SLUG &&
    (body.featured_collection?.name?.trim().length ?? 0) > 0 &&
    (body.featured_collection?.likes_count ?? 0) > 0 &&
    (body.featured_collection?.comments_count ?? 0) > 0;

  expect(
    featuredReady,
    `El perfil @${DEMO_USERNAME} no tiene Favoritos con likes/comentarios. Ejecuta npm run seed:fans (DEMO_USERNAME=${DEMO_USERNAME}).`,
  ).toBe(true);
  expect(
    notesClean,
    `El diario @${DEMO_USERNAME} no tiene reseñas limpias (≥5, sin leftovers E2E). Ejecuta npm run seed:fans.`,
  ).toBe(true);
  expect(
    socialCapsules.length,
    `El diario @${DEMO_USERNAME} necesita ${DEMO_CAPSULE_SOCIAL_COUNT} Capsules con likes y comentarios. Ejecuta npm run seed:fans.`,
  ).toBeGreaterThanOrEqual(DEMO_CAPSULE_SOCIAL_COUNT);

  return { ...body, capsules, socialCapsule: socialCapsules[0]!, socialCapsules };
}

export async function requireDemoFeaturedCollection(request: APIRequestContext) {
  const res = await request.get(
    `${API_BASE}/api/collections/user/${encodeURIComponent(DEMO_USERNAME)}/${DEMO_FEATURED_COLLECTION_SLUG}`,
  );
  expect(
    res.ok(),
    `No hay lista Favoritos (@${DEMO_USERNAME}/lists/${DEMO_FEATURED_COLLECTION_SLUG}). Ejecuta npm run seed:fans.`,
  ).toBeTruthy();
  const body = (await res.json()) as {
    collection?: { id?: string; name?: string; likes_count?: number; comments_count?: number; slug?: string };
    capsules?: unknown[];
  };
  expect(body.collection?.slug, 'Favoritos seed:fans').toBe(DEMO_FEATURED_COLLECTION_SLUG);
  expect(body.collection?.likes_count ?? 0, 'Ejecuta npm run seed:fans para likes en Favoritos').toBeGreaterThan(0);
  expect((body.capsules ?? []).length, 'Favoritos vacío — ejecuta npm run seed:fans').toBeGreaterThan(0);
  return body;
}
