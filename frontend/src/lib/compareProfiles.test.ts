import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCompareShareText,
  buildProfileCompare,
  metricBarPercents,
  type CompareSide,
} from './compareProfiles.ts';
import type { PublicProfileStats } from '../types/publicProfile.ts';

function stats(partial: Partial<PublicProfileStats> = {}): PublicProfileStats {
  return {
    totalMatches: 0,
    averageRating: null,
    topTeam: null,
    topTeams: [],
    topCompetition: null,
    peakMonth: null,
    fiveStarCount: 0,
    topWatchContext: null,
    stadiumVisits: 0,
    photosCount: 0,
    photoCollageUrls: [],
    matchesByMonth: Array.from({ length: 12 }, () => 0),
    bestRated: null,
    ...partial,
  };
}

function side(
  username: string,
  displayName: string,
  s: PublicProfileStats,
): CompareSide {
  return { username, displayName, stats: s };
}

describe('metricBarPercents', () => {
  it('reparte 50/50 si ambos son 0', () => {
    assert.deepEqual(metricBarPercents(0, 0), { mePct: 50, themPct: 50 });
  });

  it('proporciona barras según valores', () => {
    assert.deepEqual(metricBarPercents(3, 1), { mePct: 75, themPct: 25 });
    assert.deepEqual(metricBarPercents(1, 3), { mePct: 25, themPct: 75 });
  });
});

describe('buildProfileCompare', () => {
  it('marca victoria por métrica y calcula equipos compartidos', () => {
    const me = side(
      'henry',
      'Henry',
      stats({
        totalMatches: 12,
        averageRating: 4.2,
        stadiumVisits: 5,
        fiveStarCount: 3,
        photosCount: 8,
        topTeam: { name: 'Betis', count: 6 },
        topTeams: [
          { name: 'Betis', count: 6 },
          { name: 'Sevilla', count: 2 },
        ],
      }),
    );
    const them = side(
      'ana',
      'Ana',
      stats({
        totalMatches: 8,
        averageRating: 4.5,
        stadiumVisits: 2,
        fiveStarCount: 4,
        photosCount: 1,
        topTeam: { name: 'Betis', count: 5 },
        topTeams: [
          { name: 'Betis', count: 5 },
          { name: 'Madrid', count: 3 },
        ],
      }),
    );

    const result = buildProfileCompare(me, them);
    assert.equal(result.metrics.find((m) => m.id === 'matches')?.winner, 'me');
    assert.equal(result.metrics.find((m) => m.id === 'rating')?.winner, 'them');
    assert.equal(result.metrics.find((m) => m.id === 'stadium')?.winner, 'me');
    assert.equal(result.metrics.find((m) => m.id === 'fiveStar')?.winner, 'them');
    assert.equal(result.metrics.find((m) => m.id === 'photos')?.winner, 'me');
    assert.equal(result.metrics.find((m) => m.id === 'matches')?.meValue, 12);
    assert.equal(result.metrics.find((m) => m.id === 'matches')?.themValue, 8);
    assert.deepEqual(result.sharedTeams, ['Betis']);
    assert.equal(result.meWins, 3);
    assert.equal(result.themWins, 2);
    assert.match(result.headline, /Vas por delante/);
    assert.match(result.headline, /Betis/);
  });

  it('empate técnico sin shared teams expone empty copy', () => {
    const me = side('a', 'A', stats({ totalMatches: 2, averageRating: 4 }));
    const them = side('b', 'B', stats({ totalMatches: 2, averageRating: 4 }));
    const result = buildProfileCompare(me, them);
    assert.equal(result.meWins, 0);
    assert.equal(result.themWins, 0);
    assert.match(result.headline, /Empate técnico/);
    assert.deepEqual(result.sharedTeams, []);
    assert.match(result.sharedTeamsEmpty, /Sin equipos en común/);
  });

  it('usa topTeam si no hay topTeams', () => {
    const me = side(
      'a',
      'A',
      stats({ totalMatches: 1, topTeam: { name: 'Betis', count: 1 } }),
    );
    const them = side(
      'b',
      'B',
      stats({ totalMatches: 1, topTeam: { name: 'Betis', count: 1 } }),
    );
    assert.deepEqual(buildProfileCompare(me, them).sharedTeams, ['Betis']);
  });
});

describe('buildCompareShareText', () => {
  it('incluye marcador, métricas y enlace vs', () => {
    const me = side('henry', 'Henry', stats({ totalMatches: 5, stadiumVisits: 2 }));
    const them = side('ana', 'Ana', stats({ totalMatches: 3, stadiumVisits: 1 }));
    const result = buildProfileCompare(me, them);
    const text = buildCompareShareText(me, them, result);
    assert.match(text, /Cara a cara Ninety/);
    assert.match(text, /Henry vs Ana/);
    assert.match(text, /Marcador:/);
    assert.match(text, /\/u\/ana\/vs/);
    assert.match(text, /Equipos en común:/);
    assert.equal(text.includes('Partidos en común:'), false);
  });

  it('incluye partidos en común cuando hay solape', () => {
    const me = side('henry', 'Henry', stats({ totalMatches: 5 }));
    const them = side('ana', 'Ana', stats({ totalMatches: 3 }));
    const result = buildProfileCompare(me, them);
    const text = buildCompareShareText(me, them, result, 2);
    assert.match(text, /Partidos en común: 2/);
  });
});
