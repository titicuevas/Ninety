import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeDiaryDigest,
  daysBetweenUtc,
  DIGEST_GAP_MIN_DAYS,
  DIGEST_NUDGE_MIN_DAYS,
} from './diaryDigest.ts';
import type { Capsule } from '../types/capsule.ts';

function capsule(
  partial: Partial<Capsule> & Pick<Capsule, 'id' | 'watched_at' | 'home_team_name' | 'away_team_name'>,
): Capsule {
  return {
    user_id: 'u1',
    match_id: 1,
    match_played_at: null,
    home_team_crest: null,
    away_team_crest: null,
    competition_name: null,
    home_score: null,
    away_score: null,
    rating: null,
    note: null,
    photo_urls: [],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...partial,
  };
}

const NOW = new Date('2026-08-02T12:00:00Z');

describe('daysBetweenUtc', () => {
  it('cuenta días UTC enteros', () => {
    assert.equal(
      daysBetweenUtc(Date.parse('2026-07-26T23:00:00Z'), Date.parse('2026-08-02T01:00:00Z')),
      7,
    );
  });
});

describe('computeDiaryDigest', () => {
  it('devuelve null sin capsules', () => {
    assert.equal(computeDiaryDigest([], NOW), null);
  });

  it('genera resumen weekly si hay actividad reciente', () => {
    const digest = computeDiaryDigest(
      [
        capsule({
          id: '1',
          watched_at: '2026-08-01T18:00:00Z',
          home_team_name: 'Betis',
          away_team_name: 'Sevilla',
        }),
        capsule({
          id: '2',
          watched_at: '2026-07-28T18:00:00Z',
          home_team_name: 'Madrid',
          away_team_name: 'Barça',
        }),
      ],
      NOW,
    );
    assert.ok(digest);
    assert.equal(digest.kind, 'weekly');
    assert.equal(digest.recentCount7, 2);
    assert.match(digest.body, /Betis–Sevilla/);
    assert.equal(digest.href, '/capsules');
  });

  it('genera nudge tras días de inactividad', () => {
    const watched = new Date(NOW);
    watched.setUTCDate(watched.getUTCDate() - DIGEST_NUDGE_MIN_DAYS);
    const digest = computeDiaryDigest(
      [
        capsule({
          id: '1',
          watched_at: watched.toISOString(),
          home_team_name: 'Athletic',
          away_team_name: 'Real Sociedad',
        }),
      ],
      NOW,
    );
    assert.ok(digest);
    assert.equal(digest.kind, 'nudge');
    assert.equal(digest.daysSinceLast, DIGEST_NUDGE_MIN_DAYS);
    assert.equal(digest.href, '/search');
  });

  it('genera gap tras hueco largo', () => {
    const watched = new Date(NOW);
    watched.setUTCDate(watched.getUTCDate() - DIGEST_GAP_MIN_DAYS);
    const digest = computeDiaryDigest(
      [
        capsule({
          id: '1',
          watched_at: watched.toISOString(),
          home_team_name: 'Valencia',
          away_team_name: 'Villarreal',
        }),
      ],
      NOW,
    );
    assert.ok(digest);
    assert.equal(digest.kind, 'gap');
    assert.match(digest.title, /espera/i);
  });
});
