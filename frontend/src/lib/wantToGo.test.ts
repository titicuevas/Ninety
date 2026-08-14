import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  footballMatchToWantToGoInput,
  parseWantToGoWhenParam,
  partitionWantToGoMatches,
  playedWantToGoWithoutCapsule,
  wantToGoButtonLabel,
  wantToGoToFootballMatch,
} from './wantToGo.ts';
import type { WantToGoMatch } from '@/types/wantToGo';

describe('wantToGo helpers', () => {
  it('mapea FootballMatch a input de API', () => {
    const input = footballMatchToWantToGoInput({
      id: 99,
      utcDate: '2026-10-01T19:00:00Z',
      homeTeam: { name: 'Betis', crest: 'https://example.com/b.png' },
      awayTeam: { name: 'Sevilla' },
      score: { fullTime: { home: null, away: null } },
      competition: { name: 'La Liga' },
    });
    assert.equal(input.match_id, 99);
    assert.equal(input.home_team_name, 'Betis');
    assert.equal(input.away_team_name, 'Sevilla');
    assert.equal(input.competition_name, 'La Liga');
    assert.equal(input.home_team_crest, 'https://example.com/b.png');
  });

  it('mapea fila a FootballMatch', () => {
    const row: WantToGoMatch = {
      user_id: 'u1',
      match_id: -12,
      match_played_at: '2026-08-01T00:00:00.000Z',
      home_team_name: 'Amigos',
      away_team_name: 'Rivales',
      home_team_crest: null,
      away_team_crest: null,
      competition_name: 'Amistoso',
      home_score: 1,
      away_score: 0,
      note: null,
      created_at: '2026-08-12T00:00:00.000Z',
    };
    const match = wantToGoToFootballMatch(row);
    assert.equal(match.id, -12);
    assert.equal(match.homeTeam.name, 'Amigos');
    assert.equal(match.score?.fullTime?.home, 1);
    assert.equal(match.competition?.name, 'Amistoso');
  });

  it('etiqueta del botón', () => {
    assert.equal(wantToGoButtonLabel({}), 'Quiero ir');
    assert.equal(wantToGoButtonLabel({ saved: true }), 'En Quiero ir');
    assert.equal(wantToGoButtonLabel({ busy: true }), 'Guardando…');
  });

  it('parsea chip de próximos / ya jugados', () => {
    assert.equal(parseWantToGoWhenParam(null), 'all');
    assert.equal(parseWantToGoWhenParam('upcoming'), 'upcoming');
    assert.equal(parseWantToGoWhenParam('PLAYED'), 'played');
    assert.equal(parseWantToGoWhenParam('otros'), 'all');
  });

  it('parte la lista y ordena por kickoff', () => {
    const now = new Date('2026-08-14T12:00:00.000Z');
    const { upcoming, played } = partitionWantToGoMatches(
      [
        { match_id: 1, match_played_at: '2026-08-14T18:00:00.000Z' },
        { match_id: 2, match_played_at: '2026-08-14T08:00:00.000Z' },
        { match_id: 3, match_played_at: null },
        { match_id: 4, match_played_at: '2026-08-13T08:00:00.000Z' },
      ],
      now,
    );
    assert.deepEqual(
      upcoming.map((row) => row.match_id),
      [1, 3],
    );
    assert.deepEqual(
      played.map((row) => row.match_id),
      [2, 4],
    );
    assert.deepEqual(
      playedWantToGoWithoutCapsule(
        [
          { match_id: 2, match_played_at: '2026-08-14T08:00:00.000Z' },
          { match_id: 4, match_played_at: '2026-08-13T08:00:00.000Z' },
        ],
        new Set([4]),
        now,
      ).map((row) => row.match_id),
      [2],
    );
  });
});
