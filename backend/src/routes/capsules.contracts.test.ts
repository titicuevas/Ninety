import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  capsuleCalendarQuerySchema,
  capsuleFeedQuerySchema,
  capsulePhotoDeleteSchema,
  createCapsuleSchema,
  updateCapsuleSchema,
} from './capsules.contracts.js';

const validCapsule = {
  match_id: 42,
  home_team_name: 'Real Betis',
  away_team_name: 'Sevilla FC',
  watched_at: '2026-09-03',
};

describe('capsules contracts', () => {
  it('aplica los defaults de creación y feed', () => {
    assert.equal(createCapsuleSchema.parse(validCapsule).is_public, true);
    assert.deepEqual(capsuleFeedQuerySchema.parse({}), {
      limit: 20,
      offset: 0,
      scope: 'following',
      sort: 'recent',
    });
  });

  it('rechaza partidos, fechas y puntuaciones inválidos', () => {
    assert.equal(createCapsuleSchema.safeParse({ ...validCapsule, match_id: 0 }).success, false);
    assert.equal(updateCapsuleSchema.safeParse({ watched_at: '03/09/2026' }).success, false);
    assert.equal(updateCapsuleSchema.safeParse({ rating: 6 }).success, false);
  });

  it('valida calendario y URL de borrado de fotos', () => {
    assert.deepEqual(capsuleCalendarQuerySchema.parse({ year: '2026', month: '9' }), {
      year: 2026,
      month: 9,
    });
    assert.equal(capsuleCalendarQuerySchema.safeParse({ year: 2026, month: 13 }).success, false);
    assert.equal(capsulePhotoDeleteSchema.safeParse({ url: 'no-es-url' }).success, false);
  });
});
