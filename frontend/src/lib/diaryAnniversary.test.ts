import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeDiaryAnniversary } from './diaryAnniversary.ts';
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

/** Ahora fijo: 2 ago 2026 local. */
const NOW = new Date(2026, 7, 2, 15, 0, 0);

describe('computeDiaryAnniversary', () => {
  it('devuelve null sin capsules', () => {
    assert.equal(computeDiaryAnniversary([], NOW), null);
  });

  it('ignora capsules del mismo año', () => {
    const result = computeDiaryAnniversary(
      [
        capsule({
          id: 'same-year',
          watched_at: '2026-08-02',
          home_team_name: 'Betis',
          away_team_name: 'Sevilla',
        }),
      ],
      NOW,
    );
    assert.equal(result, null);
  });

  it('encuentra aniversario de hace N años', () => {
    const result = computeDiaryAnniversary(
      [
        capsule({
          id: 'c-2024',
          watched_at: '2024-08-02',
          home_team_name: 'Betis',
          away_team_name: 'Sevilla',
          rating: 5,
          note: 'Derbi inolvidable',
        }),
      ],
      NOW,
    );
    assert.ok(result);
    assert.equal(result.yearsAgo, 2);
    assert.equal(result.capsuleId, 'c-2024');
    assert.equal(result.matchLabel, 'Betis–Sevilla');
    assert.equal(result.href, '/c/c-2024');
    assert.match(result.title, /tal día como hoy/i);
    assert.match(result.body, /2 años/);
    assert.match(result.body, /Betis–Sevilla/);
    assert.match(result.body, /5★/);
    assert.match(result.body, /Derbi inolvidable/);
  });

  it('prioriza más años y mejor rating', () => {
    const result = computeDiaryAnniversary(
      [
        capsule({
          id: 'newer',
          watched_at: '2025-08-02',
          home_team_name: 'A',
          away_team_name: 'B',
          rating: 5,
        }),
        capsule({
          id: 'older',
          watched_at: '2023-08-02',
          home_team_name: 'C',
          away_team_name: 'D',
          rating: 3,
        }),
      ],
      NOW,
    );
    assert.ok(result);
    assert.equal(result.capsuleId, 'older');
    assert.equal(result.yearsAgo, 3);
    assert.equal(result.extrasCount, 1);
  });

  it('ignora otro mes/día', () => {
    const result = computeDiaryAnniversary(
      [
        capsule({
          id: 'other',
          watched_at: '2024-07-02',
          home_team_name: 'X',
          away_team_name: 'Y',
        }),
      ],
      NOW,
    );
    assert.equal(result, null);
  });

  it('acepta ISO con hora además de YYYY-MM-DD', () => {
    const result = computeDiaryAnniversary(
      [
        capsule({
          id: 'iso',
          watched_at: new Date(2024, 7, 2, 21, 0, 0).toISOString(),
          home_team_name: 'Betis',
          away_team_name: 'Sevilla',
        }),
      ],
      NOW,
    );
    assert.ok(result);
    assert.equal(result.yearsAgo, 2);
  });
});
