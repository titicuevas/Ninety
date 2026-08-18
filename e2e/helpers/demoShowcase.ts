import { expect, type APIRequestContext } from '@playwright/test';
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

/** Perfil demo con diario limpio, Favoritos y al menos una Capsule con vida social. */
export async function requireDemoShowcaseProfile(
  request: APIRequestContext,
  query = 'limit=20&offset=0',
) {
  const body = await requirePublicDemoProfile(request, query);
  const capsules = (body.capsules ?? []) as DemoCapsuleRow[];

  expect(body.featured_collection?.slug).toBe(DEMO_FEATURED_COLLECTION_SLUG);
  expect(body.featured_collection?.name?.trim().length).toBeGreaterThan(0);
  expect(body.featured_collection?.likes_count ?? 0).toBeGreaterThan(0);
  expect(body.featured_collection?.comments_count ?? 0).toBeGreaterThan(0);
  expect((body.stats?.totalMatches ?? 0)).toBeGreaterThanOrEqual(5);
  expect(capsules.length).toBeGreaterThanOrEqual(5);

  for (const capsule of capsules) {
    expect((capsule.note ?? '').trim().length, 'cada Capsule del demo debe tener reseña').toBeGreaterThan(
      0,
    );
    expect(isE2eLeftoverNote(capsule.note), 'sin residuos E2E en el diario demo').toBe(false);
  }

  const socialCapsules = capsules.filter(
    (row) => (row.likes_count ?? 0) > 0 && (row.comments_count ?? 0) > 0,
  );
  expect(
    socialCapsules.length,
    'ejecuta npm run seed:fans para sembrar likes/comentarios en varias Capsules',
  ).toBeGreaterThanOrEqual(DEMO_CAPSULE_SOCIAL_COUNT);

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
  expect(res.ok(), `Favoritos demo → ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as {
    collection?: { id?: string; name?: string; likes_count?: number; slug?: string };
    capsules?: unknown[];
  };
  expect(body.collection?.slug).toBe(DEMO_FEATURED_COLLECTION_SLUG);
  expect(body.collection?.name?.toLowerCase()).toBe('favoritos');
  expect((body.capsules ?? []).length).toBeGreaterThanOrEqual(1);
  expect(body.collection?.likes_count ?? 0).toBeGreaterThan(0);
  return body;
}
