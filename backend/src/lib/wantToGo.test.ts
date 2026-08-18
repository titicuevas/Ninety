import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clearWantToGoAfterCapsule,
  isMissingWantToGoTable,
  isWantToGoMatchPlayed,
  matchIdsToClearPlayedWithoutCapsule,
  selectUpcomingWantToGo,
  toPublicWantToGoItem,
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

  it('clasifica ya jugados y candidatos a limpiar', () => {
    const now = new Date('2026-08-14T12:00:00.000Z');
    assert.equal(isWantToGoMatchPlayed('2026-08-14T11:00:00.000Z', now), true);
    assert.equal(isWantToGoMatchPlayed('2026-08-14T13:00:00.000Z', now), false);
    assert.equal(isWantToGoMatchPlayed(null, now), false);
    assert.equal(isWantToGoMatchPlayed('no-fecha', now), false);

    assert.deepEqual(
      matchIdsToClearPlayedWithoutCapsule(
        [
          { match_id: 1, match_played_at: '2026-08-14T11:00:00.000Z' },
          { match_id: 2, match_played_at: '2026-08-14T11:00:00.000Z' },
          { match_id: 3, match_played_at: '2026-08-14T18:00:00.000Z' },
          { match_id: 4, match_played_at: null },
        ],
        new Set([2]),
        now,
      ),
      [1],
    );
  });

  it('selectUpcomingWantToGo ordena por fecha y omite jugados', () => {
    const now = new Date('2026-08-18T12:00:00.000Z');
    const upcoming = selectUpcomingWantToGo(
      [
        { id: 'played', match_played_at: '2026-08-17T20:00:00.000Z' },
        { id: 'later', match_played_at: '2026-09-02T18:00:00.000Z' },
        { id: 'soon', match_played_at: '2026-08-20T18:00:00.000Z' },
        { id: 'nodate', match_played_at: null },
      ],
      now,
    );
    assert.deepEqual(
      upcoming.map((row) => row.id),
      ['soon', 'later', 'nodate'],
    );
  });

  it('toPublicWantToGoItem no incluye nota', () => {
    const pub = toPublicWantToGoItem({
      user_id: 'secret',
      note: 'asiento 12',
      match_id: 1,
      match_played_at: null,
      home_team_name: 'Betis',
      away_team_name: 'Sevilla',
      home_team_crest: null,
      away_team_crest: null,
      competition_name: 'La Liga',
      home_score: null,
      away_score: null,
      created_at: '2026-08-01T00:00:00.000Z',
    });
    assert.equal(pub.match_id, 1);
    assert.equal(pub.home_team_name, 'Betis');
    assert.equal('note' in pub, false);
    assert.equal('user_id' in pub, false);
  });

  it('clearWantToGoAfterCapsule no lanza con match o user inválido', async () => {
    assert.equal(await clearWantToGoAfterCapsule('user-1', Number.NaN), false);
    assert.equal(await clearWantToGoAfterCapsule('', 123), false);
  });
});
