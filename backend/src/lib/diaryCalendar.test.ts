import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCalendarDayCounts,
  daysInMonth,
  isValidIsoDate,
  resolveCalendarMonth,
  watchedAtToDateKey,
} from './diaryCalendar.js';

describe('diaryCalendar', () => {
  it('isValidIsoDate rechaza fechas imposibles', () => {
    assert.equal(isValidIsoDate('2026-08-12'), true);
    assert.equal(isValidIsoDate('2026-02-30'), false);
    assert.equal(isValidIsoDate('2026-13-01'), false);
    assert.equal(isValidIsoDate('12-08-2026'), false);
  });

  it('daysInMonth respeta febrero bisiesto', () => {
    assert.equal(daysInMonth(2024, 2), 29);
    assert.equal(daysInMonth(2025, 2), 28);
    assert.equal(daysInMonth(2026, 8), 31);
  });

  it('resolveCalendarMonth calcula from/to inclusivos', () => {
    assert.deepEqual(resolveCalendarMonth(2026, 8), {
      year: 2026,
      month: 8,
      from: '2026-08-01',
      to: '2026-08-31',
    });
    assert.deepEqual(resolveCalendarMonth(2024, 2), {
      year: 2024,
      month: 2,
      from: '2024-02-01',
      to: '2024-02-29',
    });
    assert.equal(resolveCalendarMonth(2026, 0), null);
    assert.equal(resolveCalendarMonth(1989, 1), null);
  });

  it('watchedAtToDateKey normaliza ISO datetime', () => {
    assert.equal(watchedAtToDateKey('2026-08-12'), '2026-08-12');
    assert.equal(watchedAtToDateKey('2026-08-12T18:00:00.000Z'), '2026-08-12');
    assert.equal(watchedAtToDateKey('nope'), null);
  });

  it('buildCalendarDayCounts agrupa por día', () => {
    const days = buildCalendarDayCounts([
      { watched_at: '2026-08-03' },
      { watched_at: '2026-08-03T12:00:00Z' },
      { watched_at: '2026-08-05' },
      { watched_at: 'bad' },
    ]);
    assert.deepEqual(days, [
      { date: '2026-08-03', count: 2 },
      { date: '2026-08-05', count: 1 },
    ]);
  });
});
