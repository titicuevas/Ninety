import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeAdvancedStats } from './advancedStats.ts';
import { computeCapsuleStats } from './capsuleStats.ts';
import { computeInsights } from './insights.ts';
import { computeStadiumMap } from './stadiumMap.ts';
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

describe('computeInsights', () => {
  it('devuelve vacío sin partidos', () => {
    const capsules: Capsule[] = [];
    const stats = computeCapsuleStats(capsules);
    const advanced = computeAdvancedStats(capsules);
    const stadiumMap = computeStadiumMap(capsules);
    assert.deepEqual(
      computeInsights({
        name: 'Ana',
        scope: 'all',
        stats,
        advanced,
        stadiumMap,
        capsules,
      }),
      [],
    );
  });

  it('genera resumen, recomendación de partido y tip accionable', () => {
    const capsules = [
      capsule({
        id: '1',
        watched_at: '2025-03-01',
        home_team_name: 'Betis',
        away_team_name: 'Sevilla',
        competition_name: 'LaLiga',
        watch_context: 'tv',
      }),
      capsule({
        id: '2',
        watched_at: '2025-03-08',
        home_team_name: 'Betis',
        away_team_name: 'Valencia',
        competition_name: 'LaLiga',
        watch_context: 'tv',
      }),
      capsule({
        id: '3',
        watched_at: '2025-04-01',
        home_team_name: 'Madrid',
        away_team_name: 'Betis',
        competition_name: 'LaLiga',
        watch_context: 'pub',
      }),
    ];
    const stats = computeCapsuleStats(capsules);
    const advanced = computeAdvancedStats(capsules, { favoriteTeam: 'Betis' });
    const stadiumMap = computeStadiumMap(capsules);
    const insights = computeInsights({
      name: 'Ana',
      scope: 2025,
      stats,
      advanced,
      stadiumMap,
      capsules,
      favoriteTeam: 'Betis',
      followingCount: 0,
    });

    assert.ok(insights.some((i) => i.id === 'summary'));
    assert.match(insights.find((i) => i.id === 'summary')!.body, /Ana/);
    assert.match(insights.find((i) => i.id === 'summary')!.body, /2025|Betis/);

    const match = insights.find((i) => i.id === 'match-rec');
    assert.ok(match);
    assert.equal(match!.href, '/search');

    const people = insights.find((i) => i.id === 'people-rec');
    assert.ok(people);
    assert.equal(people!.href, '/search?tab=people');

    // Sin valoraciones ni estadio → tip de valorar o estadio
    assert.ok(insights.some((i) => i.kind === 'tip'));
  });

  it('recomienda explorar feed si ya hay follows', () => {
    const capsules = [
      capsule({
        id: '1',
        watched_at: '2025-01-01',
        home_team_name: 'Betis',
        away_team_name: 'Celta',
        rating: 5,
        note: 'Golazo',
        watch_context: 'stadium',
      }),
    ];
    const stats = computeCapsuleStats(capsules);
    const advanced = computeAdvancedStats(capsules, { favoriteTeam: 'Betis' });
    const stadiumMap = computeStadiumMap(capsules);
    const insights = computeInsights({
      name: 'Luis',
      scope: 'all',
      stats,
      advanced,
      stadiumMap,
      capsules,
      favoriteTeam: 'Betis',
      followingCount: 4,
    });

    const people = insights.find((i) => i.id === 'people-rec');
    assert.ok(people);
    assert.equal(people!.href, '/feed?scope=explore');
  });
});
