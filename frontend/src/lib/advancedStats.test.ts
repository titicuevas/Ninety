import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeAdvancedStats,
  formatSharePct,
  normalizeTeamName,
  teamsRoughlyMatch,
} from './advancedStats.ts';
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

describe('normalizeTeamName / teamsRoughlyMatch', () => {
  it('iguala Real Betis y Betis', () => {
    assert.equal(normalizeTeamName('Real Betis'), 'betis');
    assert.ok(teamsRoughlyMatch('Real Betis Balompié', 'Betis'));
  });
});

describe('computeAdvancedStats', () => {
  it('distribuye valoraciones 1–5 y mix de contextos', () => {
    const stats = computeAdvancedStats([
      capsule({
        id: '1',
        watched_at: '2025-01-01',
        home_team_name: 'A',
        away_team_name: 'B',
        rating: 5,
        watch_context: 'stadium',
      }),
      capsule({
        id: '2',
        watched_at: '2025-01-02',
        home_team_name: 'C',
        away_team_name: 'D',
        rating: 3,
        watch_context: 'tv',
      }),
      capsule({
        id: '3',
        watched_at: '2025-01-03',
        home_team_name: 'E',
        away_team_name: 'F',
        rating: 5,
        watch_context: 'tv',
      }),
    ]);

    assert.equal(stats.ratingDistribution.find((b) => b.stars === 5)?.count, 2);
    assert.equal(stats.ratingDistribution.find((b) => b.stars === 3)?.count, 1);
    assert.equal(stats.watchContextMix.find((m) => m.key === 'tv')?.count, 2);
    assert.equal(stats.watchContextMix.find((m) => m.key === 'stadium')?.pct, 33);
    assert.equal(formatSharePct(stats.ratedShare), '100%');
  });

  it('detecta rivalidades repetidas y equipos únicos', () => {
    const stats = computeAdvancedStats([
      capsule({
        id: '1',
        watched_at: '2025-02-01',
        home_team_name: 'Betis',
        away_team_name: 'Sevilla',
        competition_name: 'LaLiga',
        rating: 4,
      }),
      capsule({
        id: '2',
        watched_at: '2025-03-01',
        home_team_name: 'Sevilla',
        away_team_name: 'Betis',
        competition_name: 'Copa',
        rating: 5,
      }),
      capsule({
        id: '3',
        watched_at: '2025-04-01',
        home_team_name: 'Madrid',
        away_team_name: 'Barça',
        competition_name: 'LaLiga',
      }),
    ]);

    assert.equal(stats.topRivalries.length, 1);
    assert.equal(stats.topRivalries[0]?.count, 2);
    assert.equal(stats.topRivalries[0]?.averageRating, 4.5);
    assert.equal(stats.uniqueTeams, 4);
    assert.equal(stats.uniqueCompetitions, 2);
    assert.equal(stats.repeatRivalries, 1);
  });

  it('calcula W-D-L del equipo favorito con marcador', () => {
    const stats = computeAdvancedStats(
      [
        capsule({
          id: '1',
          watched_at: '2025-01-01',
          home_team_name: 'Real Betis',
          away_team_name: 'Sevilla',
          home_score: 2,
          away_score: 1,
        }),
        capsule({
          id: '2',
          watched_at: '2025-01-08',
          home_team_name: 'Madrid',
          away_team_name: 'Betis',
          home_score: 1,
          away_score: 1,
        }),
        capsule({
          id: '3',
          watched_at: '2025-01-15',
          home_team_name: 'Betis',
          away_team_name: 'Valencia',
          home_score: 0,
          away_score: 2,
        }),
        capsule({
          id: '4',
          watched_at: '2025-01-22',
          home_team_name: 'Madrid',
          away_team_name: 'Barça',
          home_score: 3,
          away_score: 0,
        }),
      ],
      { favoriteTeam: 'Betis' },
    );

    assert.ok(stats.favoriteTeamRecord);
    assert.equal(stats.favoriteTeamRecord.watched, 3);
    assert.equal(stats.favoriteTeamRecord.wins, 1);
    assert.equal(stats.favoriteTeamRecord.draws, 1);
    assert.equal(stats.favoriteTeamRecord.losses, 1);
  });

  it('estima días medios entre partidos', () => {
    const stats = computeAdvancedStats([
      capsule({ id: '1', watched_at: '2025-01-01', home_team_name: 'A', away_team_name: 'B' }),
      capsule({ id: '2', watched_at: '2025-01-11', home_team_name: 'C', away_team_name: 'D' }),
      capsule({ id: '3', watched_at: '2025-01-21', home_team_name: 'E', away_team_name: 'F' }),
    ]);
    assert.equal(stats.avgDaysBetween, 10);
  });
});
