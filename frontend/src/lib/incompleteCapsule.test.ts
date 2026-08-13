import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findIncompleteCapsule } from './incompleteCapsule.ts';
import type { Capsule } from '../types/capsule.ts';

function capsule(partial: Partial<Capsule> & Pick<Capsule, 'id'>): Capsule {
  return {
    user_id: 'u1',
    match_id: 1,
    match_played_at: null,
    home_team_name: 'Betis',
    away_team_name: 'Sevilla',
    home_team_crest: null,
    away_team_crest: null,
    competition_name: 'La Liga',
    home_score: 1,
    away_score: 1,
    watched_at: '2024-06-01',
    rating: 4,
    note: null,
    photo_urls: [],
    created_at: '2024-06-01T00:00:00.000Z',
    updated_at: '2024-06-01T00:00:00.000Z',
    ...partial,
  };
}

describe('findIncompleteCapsule', () => {
  it('elige la valorada sin nota ni fotos más reciente', () => {
    const nudge = findIncompleteCapsule([
      capsule({ id: 'old', watched_at: '2024-01-01', rating: 5 }),
      capsule({ id: 'new', watched_at: '2024-08-01', rating: 4 }),
      capsule({ id: 'complete', watched_at: '2024-09-01', rating: 5, note: 'Top' }),
    ]);
    assert.equal(nudge?.capsuleId, 'new');
    assert.match(nudge?.href ?? '', /\/capsules\/new\/edit/);
  });

  it('ignora sin rating o ya enriquecidas', () => {
    assert.equal(
      findIncompleteCapsule([
        capsule({ id: 'a', rating: null }),
        capsule({ id: 'b', rating: 3, note: 'ok' }),
        capsule({ id: 'c', rating: 3, photo_urls: ['https://x/y.jpg'] }),
      ]),
      null,
    );
  });

  it('respeta skippedIds', () => {
    const nudge = findIncompleteCapsule(
      [capsule({ id: 'skip-me', rating: 5 }), capsule({ id: 'next', watched_at: '2023-01-01', rating: 4 })],
      ['skip-me'],
    );
    assert.equal(nudge?.capsuleId, 'next');
  });
});
