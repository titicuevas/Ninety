import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sortMatchesForSearch, takeSearchResults, type FootballMatch } from './footballSearch.js';

function match(id: number, utcDate: string, status = 'SCHEDULED'): FootballMatch {
  return {
    id,
    utcDate,
    status,
    homeTeam: { name: 'Home' },
    awayTeam: { name: 'Away' },
  };
}

describe('sortMatchesForSearch', () => {
  it('pone próximos primero (asc) y jugados después (desc)', () => {
    const now = new Date('2026-09-14T12:00:00.000Z');
    const sorted = sortMatchesForSearch(
      [
        match(1, '2026-09-10T18:00:00.000Z', 'FINISHED'),
        match(2, '2026-09-20T18:00:00.000Z', 'SCHEDULED'),
        match(3, '2026-09-08T18:00:00.000Z', 'FINISHED'),
        match(4, '2026-09-18T18:00:00.000Z', 'TIMED'),
      ],
      now,
    );
    assert.deepEqual(
      sorted.map((m) => m.id),
      [4, 2, 1, 3],
    );
  });
});

describe('takeSearchResults', () => {
  it('mezcla próximos y jugados sin llenar solo con futuros', () => {
    const now = new Date('2026-09-14T12:00:00.000Z');
    const pool: FootballMatch[] = [];
    for (let i = 0; i < 20; i++) {
      const day = 15 + (i % 10);
      pool.push(match(100 + i, `2026-09-${String(day).padStart(2, '0')}T18:00:00.000Z`, 'TIMED'));
    }
    for (let i = 0; i < 20; i++) {
      const day = 1 + (i % 10);
      pool.push(match(200 + i, `2026-09-${String(day).padStart(2, '0')}T18:00:00.000Z`, 'FINISHED'));
    }
    const taken = takeSearchResults(pool, 20, now);
    const upcoming = taken.filter((m) => Date.parse(m.utcDate!) >= now.getTime());
    const past = taken.filter((m) => Date.parse(m.utcDate!) < now.getTime());
    assert.equal(taken.length, 20);
    assert.ok(upcoming.length >= 10);
    assert.ok(past.length >= 5);
  });
});
