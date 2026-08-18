import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computePublicProfileStats, groupPublicProfileStatsByYear } from './publicProfileStats.js';

describe('computePublicProfileStats', () => {
  it('calcula totales, top equipo, mes pico, estadio y collage', () => {
    const stats = computePublicProfileStats([
      {
        watched_at: '2025-01-10',
        rating: 5,
        home_team_name: 'Betis',
        away_team_name: 'Sevilla',
        competition_name: 'LaLiga',
        watch_context: 'stadium',
        photo_urls: ['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg'],
      },
      {
        watched_at: '2025-03-01',
        rating: 4,
        home_team_name: 'Betis',
        away_team_name: 'Madrid',
        competition_name: 'LaLiga',
        watch_context: 'tv',
        photo_urls: ['https://cdn.example/c.jpg'],
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
    assert.equal(stats.topTeams[0]?.name, 'Betis');
    assert.equal(stats.topTeams.length, 4);
    assert.equal(stats.topCompetition?.name, 'LaLiga');
    assert.equal(stats.peakMonth?.month, 3);
    assert.equal(stats.fiveStarCount, 2);
    assert.equal(stats.topWatchContext?.name, 'TV');
    assert.equal(stats.stadiumVisits, 1);
    assert.equal(stats.photosCount, 3);
    assert.equal(stats.photoCollageUrls.length, 3);
    assert.equal(stats.photoCollageUrls[0], 'https://cdn.example/a.jpg');
    assert.equal(stats.matchesByMonth[0], 1);
    assert.equal(stats.matchesByMonth[2], 2);
    assert.equal(stats.bestRated?.home_team_name, 'Betis');
    assert.equal(stats.bestRated?.away_team_name, 'Sevilla');
    assert.equal(stats.bestRated?.rating, 5);
    assert.ok(stats.averageRating != null && stats.averageRating > 4);
  });

  it('agrupa stats del Wrapped público por año', () => {
    const grouped = groupPublicProfileStatsByYear([
      {
        watched_at: '2025-01-10',
        rating: 5,
        home_team_name: 'Betis',
        away_team_name: 'Sevilla',
        competition_name: 'LaLiga',
      },
      {
        watched_at: '2026-08-01',
        rating: 4,
        home_team_name: 'Betis',
        away_team_name: 'Madrid',
        competition_name: 'LaLiga',
      },
      {
        watched_at: '2026-09-01',
        rating: 3,
        home_team_name: 'Sevilla',
        away_team_name: 'Barça',
        competition_name: 'Champions',
      },
    ]);
    assert.equal(grouped['2025']?.totalMatches, 1);
    assert.equal(grouped['2025']?.topTeam?.name, 'Betis');
    assert.equal(grouped['2026']?.totalMatches, 2);
    assert.equal(grouped['2026']?.topCompetition?.name, 'LaLiga');
    assert.equal(grouped['2024'], undefined);
  });
});
