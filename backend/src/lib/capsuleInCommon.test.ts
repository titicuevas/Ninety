import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  chunkMatchIds,
  mergeCapsulesInCommon,
  uniqueValidMatchIds,
  type CapsuleMatchRow,
} from './capsuleInCommon.js';

const row = (
  id: string,
  matchId: number,
  extra: Partial<CapsuleMatchRow> = {},
): CapsuleMatchRow => ({
  id,
  match_id: matchId,
  rating: 4,
  home_team_name: 'Betis',
  away_team_name: 'Sevilla',
  competition_name: 'LaLiga',
  watched_at: '2024-04-21',
  photo_urls: null,
  ...extra,
});

describe('uniqueValidMatchIds', () => {
  it('quita nulos, ceros y duplicados', () => {
    assert.deepEqual(uniqueValidMatchIds([42, 0, 42, null, -7, 1.5]), [42, -7]);
  });
});

describe('chunkMatchIds', () => {
  it('parte en trozos', () => {
    assert.deepEqual(chunkMatchIds([1, 2, 3, 4], 2), [
      [1, 2],
      [3, 4],
    ]);
  });
});

describe('mergeCapsulesInCommon', () => {
  it('cruza por match_id y ordena por fecha', () => {
    const mine = [
      row('me-old', 1, { watched_at: '2023-01-01' }),
      row('me-new', 2, { watched_at: '2025-01-01', rating: 5 }),
      row('me-only', 9),
    ];
    const theirs = [
      row('them-old', 1, { watched_at: '2023-06-01', rating: 3 }),
      row('them-new', 2, { watched_at: '2025-02-01', rating: 2, home_team_name: 'Madrid' }),
      row('them-only', 8),
    ];
    const { matches, total } = mergeCapsulesInCommon(mine, theirs, 12);
    assert.equal(total, 2);
    assert.equal(matches[0]?.match_id, 2);
    assert.equal(matches[0]?.them_capsule_id, 'them-new');
    assert.equal(matches[0]?.me_capsule_id, 'me-new');
    assert.equal(matches[0]?.me_rating, 5);
    assert.equal(matches[0]?.them_rating, 2);
    assert.equal(matches[0]?.home_team_name, 'Madrid');
    assert.equal(matches[1]?.match_id, 1);
  });

  it('respeta el límite de lista', () => {
    const mine = [row('a', 1), row('b', 2)];
    const theirs = [row('x', 1), row('y', 2)];
    const { matches, total } = mergeCapsulesInCommon(mine, theirs, 1);
    assert.equal(total, 2);
    assert.equal(matches.length, 1);
  });
});
