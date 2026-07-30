import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computePublicProfileStats } from './publicProfileStats.js';

describe('computePublicProfileStats', () => {
  it('calcula totales, top equipo y mes pico', () => {
    const stats = computePublicProfileStats([
      {
        watched_at: '2025-01-10',
        rating: 5,
        home_team_name: 'Betis',
        away_team_name: 'Sevilla',
        competition_name: 'LaLiga',
        watch_context: 'stadium',
      },
      {
        watched_at: '2025-03-01',
        rating: 4,
        home_team_name: 'Betis',
        away_team_name: 'Madrid',
        competition_name: 'LaLiga',
        watch_context: 'tv',
      },
      {
        watched_at: '2025-03-15',
        rating: 5,
        home_team_name: 'Betis',
        away_team_name: 'Barça',
        competition_name: 'Champions',
        watch_context: 'tv',
      },
    ]);

    assert.equal(stats.totalMatches, 3);
    assert.equal(stats.topTeam?.name, 'Betis');
    assert.equal(stats.topTeam?.count, 3);
    assert.equal(stats.topCompetition?.name, 'LaLiga');
    assert.equal(stats.peakMonth?.month, 3);
    assert.equal(stats.fiveStarCount, 2);
    assert.equal(stats.topWatchContext?.name, 'TV');
    assert.ok(stats.averageRating != null && stats.averageRating > 4);
  });
});
