import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickPublicWrappedStats, publicWrappedPeriodLabel } from './publicWrapped.ts';
import type { PublicProfileStats } from '../types/publicProfile.ts';

function stats(totalMatches: number): PublicProfileStats {
  return {
    totalMatches,
    averageRating: 4,
    topTeam: null,
    topCompetition: null,
    peakMonth: null,
    fiveStarCount: 0,
    topWatchContext: null,
    stadiumVisits: 0,
    photosCount: 0,
    photoCollageUrls: [],
    matchesByMonth: Array.from({ length: 12 }, () => 0),
    bestRated: null,
  };
}

describe('publicWrapped', () => {
  it('elige stats de por vida o del año', () => {
    const lifetime = stats(10);
    const byYear = { '2025': stats(4), '2026': stats(6) };
    assert.equal(pickPublicWrappedStats(lifetime, byYear, 'all')?.totalMatches, 10);
    assert.equal(pickPublicWrappedStats(lifetime, byYear, 2025)?.totalMatches, 4);
    assert.equal(pickPublicWrappedStats(lifetime, undefined, 2025)?.totalMatches, 10);
    assert.equal(pickPublicWrappedStats(lifetime, byYear, 2019)?.totalMatches, 10);
  });

  it('escribe el periodo del Wrapped público', () => {
    assert.equal(publicWrappedPeriodLabel('all', 3), 'Resumen de su diario visible · 3 partidos');
    assert.equal(publicWrappedPeriodLabel(2025, 1), 'Su 2025 · 1 partido');
  });
});
