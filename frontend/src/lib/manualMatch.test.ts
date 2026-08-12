import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildManualFootballMatch,
  isManualMatchId,
  manualMatchId,
  normalizeManualTeamName,
} from './manualMatch.js';

describe('manualMatch', () => {
  it('normalizeManualTeamName colapsa espacios y minúsculas', () => {
    assert.equal(normalizeManualTeamName('  Real  Betis  '), 'real betis');
  });

  it('manualMatchId es negativo, estable y distinto si cambia el partido', () => {
    const a = manualMatchId({
      homeTeam: 'Betis',
      awayTeam: 'Sevilla',
      playedAt: '2024-05-01',
    });
    const b = manualMatchId({
      homeTeam: '  betis ',
      awayTeam: 'SEVILLA',
      playedAt: '2024-05-01',
    });
    const c = manualMatchId({
      homeTeam: 'Betis',
      awayTeam: 'Sevilla',
      playedAt: '2024-05-02',
    });
    assert.ok(isManualMatchId(a));
    assert.equal(a, b);
    assert.notEqual(a, c);
  });

  it('buildManualFootballMatch arma un FootballMatch listo para Capsule', () => {
    const match = buildManualFootballMatch({
      homeTeam: 'Amigos FC',
      awayTeam: 'Barrio Utd',
      playedAt: '2023-06-15',
      competition: 'Torneo local',
      homeScore: 2,
      awayScore: 1,
    });
    assert.ok(isManualMatchId(match.id));
    assert.equal(match.homeTeam.name, 'Amigos FC');
    assert.equal(match.awayTeam.name, 'Barrio Utd');
    assert.equal(match.competition?.name, 'Torneo local');
    assert.deepEqual(match.score?.fullTime, { home: 2, away: 1 });
    assert.equal(match.utcDate?.slice(0, 10), '2023-06-15');
  });
});
