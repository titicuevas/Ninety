import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeDiaryAnniversary } from './diaryAnniversary.js';

const CAPSULES = [
  {
    id: 'c1',
    watched_at: '2023-08-12',
    home_team_name: 'Athletic',
    away_team_name: 'Barça',
    rating: 5,
    note: 'Noche épica',
  },
  {
    id: 'c2',
    watched_at: '2024-08-12',
    home_team_name: 'Madrid',
    away_team_name: 'Atleti',
    rating: 3,
    note: null,
  },
  {
    id: 'c3',
    watched_at: '2025-03-01',
    home_team_name: 'Sevilla',
    away_team_name: 'Betis',
    rating: 4,
    note: null,
  },
];

describe('computeDiaryAnniversary', () => {
  it('devuelve null sin candidatos', () => {
    assert.equal(computeDiaryAnniversary([], { year: 2026, month: 8, day: 12 }), null);
    assert.equal(
      computeDiaryAnniversary(CAPSULES, { year: 2026, month: 1, day: 1 }),
      null,
    );
  });

  it('elige el aniversario con mejor score (≥1 año)', () => {
    const result = computeDiaryAnniversary(CAPSULES, { year: 2026, month: 8, day: 12 });
    assert.ok(result);
    assert.equal(result.capsuleId, 'c1');
    assert.equal(result.yearsAgo, 3);
    assert.equal(result.extrasCount, 1);
    assert.equal(result.title, 'Tal día como hoy');
    assert.match(result.body, /Athletic–Barça/);
    assert.equal(result.href, '/c/c1');
  });

  it('ignora el mismo año', () => {
    const result = computeDiaryAnniversary(
      [
        {
          id: 'today',
          watched_at: '2026-08-12',
          home_team_name: 'A',
          away_team_name: 'B',
          rating: 5,
          note: null,
        },
      ],
      { year: 2026, month: 8, day: 12 },
    );
    assert.equal(result, null);
  });
});
