import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calendarYearForSeasonMonth,
  currentLeagueSeasonStart,
  filterMatchesByDateRange,
  matchInDateRange,
  parseMonth,
  resolveMonthDateRange,
} from './matchDateRange.js';

describe('matchDateRange', () => {
  it('parseMonth acepta 1–12', () => {
    assert.equal(parseMonth('3'), 3);
    assert.equal(parseMonth(12), 12);
    assert.equal(parseMonth('0'), undefined);
    assert.equal(parseMonth('13'), undefined);
    assert.equal(parseMonth(''), undefined);
  });

  it('currentLeagueSeasonStart corta en julio', () => {
    assert.equal(currentLeagueSeasonStart(new Date('2026-07-31')), 2026);
    assert.equal(currentLeagueSeasonStart(new Date('2026-06-30')), 2025);
  });

  it('calendarYearForSeasonMonth mapea ligas ago–may', () => {
    assert.equal(calendarYearForSeasonMonth(8, 2024), 2024);
    assert.equal(calendarYearForSeasonMonth(12, 2024), 2024);
    assert.equal(calendarYearForSeasonMonth(1, 2024), 2025);
    assert.equal(calendarYearForSeasonMonth(7, 2024), 2025);
  });

  it('calendarYearForSeasonMonth respeta torneos de año civil', () => {
    assert.equal(calendarYearForSeasonMonth(11, 2022, true), 2022);
    assert.equal(calendarYearForSeasonMonth(3, 2024, true), 2024);
  });

  it('resolveMonthDateRange para liga en marzo (segunda mitad)', () => {
    assert.deepEqual(resolveMonthDateRange({ month: 3, season: 2024 }), {
      dateFrom: '2025-03-01',
      dateTo: '2025-03-31',
    });
  });

  it('resolveMonthDateRange para liga en agosto', () => {
    assert.deepEqual(resolveMonthDateRange({ month: 8, season: 2024 }), {
      dateFrom: '2024-08-01',
      dateTo: '2024-08-31',
    });
  });

  it('resolveMonthDateRange para Mundial usa el año del torneo', () => {
    assert.deepEqual(
      resolveMonthDateRange({ month: 11, season: 2022, calendarYearSeason: true }),
      { dateFrom: '2022-11-01', dateTo: '2022-11-30' },
    );
  });

  it('resolveMonthDateRange contempla febrero bisiesto', () => {
    assert.deepEqual(resolveMonthDateRange({ month: 2, season: 2023 }), {
      dateFrom: '2024-02-01',
      dateTo: '2024-02-29',
    });
  });

  it('resolveMonthDateRange sin season usa la temporada en curso', () => {
    const range = resolveMonthDateRange({ month: 9, now: new Date('2026-03-15') });
    assert.deepEqual(range, { dateFrom: '2025-09-01', dateTo: '2025-09-30' });
  });

  it('filterMatchesByDateRange filtra por utcDate', () => {
    const matches = [
      { id: 1, utcDate: '2025-03-10T20:00:00Z' },
      { id: 2, utcDate: '2025-04-01T18:00:00Z' },
      { id: 3, utcDate: undefined },
    ];
    const filtered = filterMatchesByDateRange(matches, {
      dateFrom: '2025-03-01',
      dateTo: '2025-03-31',
    });
    assert.deepEqual(filtered.map((m) => m.id), [1]);
    assert.equal(matchInDateRange(matches[0]!, { dateFrom: '2025-03-01', dateTo: '2025-03-31' }), true);
  });
});
