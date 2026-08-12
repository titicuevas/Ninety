import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildMonthGrid,
  capsulesForDate,
  countCapsulesByWatchedDate,
  formatCalendarMonthTitle,
  parseCalendarMonthParam,
  shiftCalendarMonth,
  toIsoDate,
  weekdayLabels,
} from './diaryCalendar.ts';
import type { Capsule } from '@/types/capsule';

function stubCapsule(partial: Partial<Capsule> & Pick<Capsule, 'id' | 'watched_at'>): Capsule {
  return {
    user_id: 'u1',
    match_id: 1,
    match_played_at: null,
    home_team_name: 'A',
    away_team_name: 'B',
    home_team_crest: null,
    away_team_crest: null,
    competition_name: null,
    home_score: null,
    away_score: null,
    rating: null,
    note: null,
    photo_urls: [],
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...partial,
  };
}

describe('diaryCalendar frontend', () => {
  it('parseCalendarMonthParam usa mes actual si params inválidos', () => {
    const now = new Date(2026, 7, 12); // agosto
    assert.deepEqual(parseCalendarMonthParam(null, null, now), { year: 2026, month: 8 });
    assert.deepEqual(parseCalendarMonthParam('2025', '3', now), { year: 2025, month: 3 });
    assert.deepEqual(parseCalendarMonthParam('nope', '3', now), { year: 2026, month: 8 });
  });

  it('shiftCalendarMonth cruza año', () => {
    assert.deepEqual(shiftCalendarMonth({ year: 2026, month: 1 }, -1), {
      year: 2025,
      month: 12,
    });
    assert.deepEqual(shiftCalendarMonth({ year: 2025, month: 12 }, 1), {
      year: 2026,
      month: 1,
    });
  });

  it('buildMonthGrid marca días con Capsules (lunes primero)', () => {
    // 2026-08-01 was a Saturday → mondayOffset = 5
    const counts = new Map([['2026-08-03', 2], ['2026-08-12', 1]]);
    const grid = buildMonthGrid(2026, 8, counts);
    assert.equal(weekdayLabels().length, 7);
    assert.equal(grid.filter((c) => c.kind === 'pad').length >= 5, true);
    const day3 = grid.find((c) => c.kind === 'day' && c.day === 3);
    assert.ok(day3 && day3.kind === 'day');
    assert.equal(day3.count, 2);
    assert.equal(day3.date, '2026-08-03');
    assert.equal(toIsoDate(2026, 8, 3), '2026-08-03');
  });

  it('countCapsulesByWatchedDate y capsulesForDate', () => {
    const capsules = [
      stubCapsule({ id: '1', watched_at: '2026-08-03', created_at: '2026-08-03T10:00:00Z' }),
      stubCapsule({ id: '2', watched_at: '2026-08-03', created_at: '2026-08-03T12:00:00Z' }),
      stubCapsule({ id: '3', watched_at: '2026-08-05' }),
    ];
    const counts = countCapsulesByWatchedDate(capsules);
    assert.equal(counts.get('2026-08-03'), 2);
    const day = capsulesForDate(capsules, '2026-08-03');
    assert.equal(day.length, 2);
    assert.equal(day[0]?.id, '2');
  });

  it('formatCalendarMonthTitle capitaliza', () => {
    const title = formatCalendarMonthTitle(2026, 8);
    assert.match(title, /2026/);
    assert.equal(title[0], title[0]?.toUpperCase());
  });
});
