import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeCapsuleStats, type CapsuleStats } from './capsuleStats.ts';
import type { Capsule } from '../types/capsule.ts';

function capsule(partial: Partial<Capsule> & Pick<Capsule, 'id' | 'watched_at' | 'home_team_name' | 'away_team_name'>): Capsule {
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

describe('computeCapsuleStats', () => {
  it('calcula racha más larga de días consecutivos', () => {
    const stats = computeCapsuleStats([
      capsule({ id: '1', watched_at: '2025-03-01', home_team_name: 'A', away_team_name: 'B' }),
      capsule({ id: '2', watched_at: '2025-03-02', home_team_name: 'C', away_team_name: 'D' }),
      capsule({ id: '3', watched_at: '2025-03-03', home_team_name: 'E', away_team_name: 'F' }),
      capsule({ id: '4', watched_at: '2025-03-10', home_team_name: 'G', away_team_name: 'H' }),
    ]);

    assert.equal(stats.longestStreak, 3);
  });

  it('devuelve top 3 equipos por apariciones', () => {
    const stats: CapsuleStats = computeCapsuleStats([
      capsule({ id: '1', watched_at: '2025-01-01', home_team_name: 'Betis', away_team_name: 'Sevilla' }),
      capsule({ id: '2', watched_at: '2025-01-02', home_team_name: 'Betis', away_team_name: 'Madrid' }),
      capsule({ id: '3', watched_at: '2025-01-03', home_team_name: 'Betis', away_team_name: 'Barça' }),
      capsule({ id: '4', watched_at: '2025-01-04', home_team_name: 'Sevilla', away_team_name: 'Valencia' }),
    ]);

    assert.equal(stats.topTeams[0]?.name, 'Betis');
    assert.equal(stats.topTeams[0]?.count, 3);
    assert.equal(stats.topTeams[1]?.name, 'Sevilla');
    assert.equal(stats.topTeams.length, 3);
  });

  it('cuenta partidos por mes', () => {
    const stats = computeCapsuleStats([
      capsule({ id: '1', watched_at: '2025-01-10', home_team_name: 'A', away_team_name: 'B' }),
      capsule({ id: '2', watched_at: '2025-01-20', home_team_name: 'C', away_team_name: 'D' }),
      capsule({ id: '3', watched_at: '2025-07-01', home_team_name: 'E', away_team_name: 'F' }),
    ]);

    assert.equal(stats.matchesByMonth[0], 2);
    assert.equal(stats.matchesByMonth[6], 1);
    assert.equal(stats.matchesByMonth.reduce((a, b) => a + b, 0), 3);
  });
});
