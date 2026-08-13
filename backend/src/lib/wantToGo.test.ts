import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clearWantToGoAfterCapsule,
  isMissingWantToGoTable,
  normalizeMatchPlayedAt,
  normalizeOptionalScore,
  normalizeTeamName,
  sanitizeWantToGoInput,
} from './wantToGo.js';

describe('wantToGo helpers', () => {
  it('normaliza nombres de equipo', () => {
    assert.equal(normalizeTeamName('  Betis  '), 'Betis');
    assert.equal(normalizeTeamName(''), null);
    assert.equal(normalizeTeamName('   '), null);
    assert.equal(normalizeTeamName(null), null);
  });

  it('normaliza marcadores opcionales', () => {
    assert.equal(normalizeOptionalScore(2), 2);
    assert.equal(normalizeOptionalScore('3'), 3);
    assert.equal(normalizeOptionalScore(null), null);
    assert.equal(normalizeOptionalScore(-1), null);
    assert.equal(normalizeOptionalScore(100), null);
    assert.equal(normalizeOptionalScore(1.5), null);
  });

  it('normaliza fechas ISO', () => {
    assert.equal(normalizeMatchPlayedAt('2026-08-20T18:00:00.000Z'), '2026-08-20T18:00:00.000Z');
    assert.equal(normalizeMatchPlayedAt(''), null);
    assert.equal(normalizeMatchPlayedAt('not-a-date'), null);
  });

  it('sanea input válido (catálogo y manual)', () => {
    const catalog = sanitizeWantToGoInput({
      match_id: 12345,
      home_team_name: 'Betis',
      away_team_name: 'Sevilla',
      match_played_at: '2026-09-01T20:00:00Z',
      competition_name: 'La Liga',
      home_score: null,
      away_score: null,
    });
    assert.ok(catalog);
    assert.equal(catalog.match_id, 12345);
    assert.equal(catalog.home_team_name, 'Betis');
    assert.equal(catalog.competition_name, 'La Liga');

    const manual = sanitizeWantToGoInput({
      match_id: -42,
      home_team_name: 'Amigos FC',
      away_team_name: 'Barrio United',
    });
    assert.ok(manual);
    assert.equal(manual.match_id, -42);
  });

  it('rechaza input inválido', () => {
    assert.equal(
      sanitizeWantToGoInput({
        match_id: 0,
        home_team_name: 'A',
        away_team_name: 'B',
      }),
      null,
    );
    assert.equal(
      sanitizeWantToGoInput({
        match_id: 1,
        home_team_name: 'Betis',
        away_team_name: 'betis',
      }),
      null,
    );
    assert.equal(
      sanitizeWantToGoInput({
        match_id: 1,
        home_team_name: '',
        away_team_name: 'Sevilla',
      }),
      null,
    );
  });

  it('detecta tabla ausente', () => {
    assert.equal(isMissingWantToGoTable({ code: '42P01', message: 'relation does not exist' }), true);
    assert.equal(
      isMissingWantToGoTable({ message: 'Could not find the table public.want_to_go_matches' }),
      true,
    );
    assert.equal(isMissingWantToGoTable({ code: '23505', message: 'duplicate key' }), false);
  });

  it('clearWantToGoAfterCapsule no lanza con match o user inválido', async () => {
    assert.equal(await clearWantToGoAfterCapsule('user-1', Number.NaN), false);
    assert.equal(await clearWantToGoAfterCapsule('', 123), false);
  });
});
