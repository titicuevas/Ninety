import { test, type APIRequestContext } from '@playwright/test';
import { API_BASE, DEMO_USERNAME, requirePublicDemoProfile } from './auth';
import { isE2eLeftoverNote } from './e2eCapsuleNotes';

/** Lista destacada sembrada por `npm run seed:fans`. */
export const DEMO_FEATURED_COLLECTION_SLUG = 'favoritos-seed';

/** Cuántas Capsules del diario demo deben tener likes y comentarios (`seed:fans`). */
export const DEMO_CAPSULE_SOCIAL_COUNT = 3;

/** Marcador en comentarios sembrados — idempotente al re-ejecutar seed:fans. */
export const DEMO_SOCIAL_COMMENT_MARKER = 'ninety-seed';

export type DemoCapsuleRow = {
  id?: string;
  note?: string | null;
  likes_count?: number;
  comments_count?: number;
  home_team_name?: string;
  away_team_name?: string;
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

  test.skip(
    !featuredReady || !notesClean || socialCapsules.length < DEMO_CAPSULE_SOCIAL_COUNT,
    `El perfil @${DEMO_USERNAME} no tiene el showcase de seed:fans (Favoritos con likes/comentarios, reseñas y ${DEMO_CAPSULE_SOCIAL_COUNT} Capsules sociales).`,
  );

  return { ...body, capsules, socialCapsule: socialCapsules[0]!, socialCapsules };
}

export function findDemoSocialCapsule(capsules: DemoCapsuleRow[]): DemoCapsuleRow | undefined {
  return capsules.find(
    (row) => (row.likes_count ?? 0) > 0 && (row.comments_count ?? 0) > 0,
  );
}

export async function requireDemoFeaturedCollection(request: APIRequestContext) {
  const res = await request.get(
    `${API_BASE}/api/collections/user/${encodeURIComponent(DEMO_USERNAME)}/${DEMO_FEATURED_COLLECTION_SLUG}`,
  );
  if (res.status() === 404 || !res.ok()) {
    test.skip(
      true,
      `No hay lista Favoritos (@${DEMO_USERNAME}/lists/${DEMO_FEATURED_COLLECTION_SLUG}). Ejecuta npm run seed:fans.`,
    );
  }
  const body = (await res.json()) as {
    collection?: { id?: string; name?: string; likes_count?: number; slug?: string };
    capsules?: unknown[];
  };
  test.skip(
    body.collection?.slug !== DEMO_FEATURED_COLLECTION_SLUG ||
      (body.collection?.likes_count ?? 0) < 1 ||
      (body.capsules ?? []).length < 1,
    'Ejecuta npm run seed:fans para Favoritos con likes',
  );
  return body;
}
