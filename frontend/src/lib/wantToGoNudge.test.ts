import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  findWantToGoNudge,
  isMatchInWantToGoNudgeWindow,
  isMatchInWantToGoPlayedWindow,
  selectWantToGoNudgeMatches,
  selectWantToGoPlayedNudgeMatches,
  WANT_TO_GO_NUDGE_WINDOW_MS,
} from './wantToGoNudge.ts';

const NOW = new Date('2026-08-13T12:00:00.000Z');

function hoursFromNow(h: number): string {
  return new Date(NOW.getTime() + h * 60 * 60 * 1000).toISOString();
}

describe('wantToGoNudge', () => {
  it('isMatchInWantToGoNudgeWindow solo futuros dentro de 48 h', () => {
    assert.equal(isMatchInWantToGoNudgeWindow(hoursFromNow(24), NOW), true);
    assert.equal(isMatchInWantToGoNudgeWindow(hoursFromNow(1), NOW), true);
    assert.equal(isMatchInWantToGoNudgeWindow(hoursFromNow(49), NOW), false);
    assert.equal(isMatchInWantToGoNudgeWindow(hoursFromNow(-1), NOW), false);
    assert.equal(isMatchInWantToGoNudgeWindow(null, NOW), false);
    assert.equal(
      isMatchInWantToGoNudgeWindow(hoursFromNow(50), NOW, WANT_TO_GO_NUDGE_WINDOW_MS),
      false,
    );
  });

  it('isMatchInWantToGoPlayedWindow solo pasados recientes', () => {
    assert.equal(isMatchInWantToGoPlayedWindow(hoursFromNow(-6), NOW), true);
    assert.equal(isMatchInWantToGoPlayedWindow(hoursFromNow(-24 * 10), NOW), true);
    assert.equal(isMatchInWantToGoPlayedWindow(hoursFromNow(-24 * 15), NOW), false);
    assert.equal(isMatchInWantToGoPlayedWindow(hoursFromNow(2), NOW), false);
    assert.equal(isMatchInWantToGoPlayedWindow(null, NOW), false);
  });

  it('selectWantToGoNudgeMatches ordena y respeta skipped', () => {
    const matches = [
      {
        match_id: 2,
        home_team_name: 'B',
        away_team_name: 'C',
        match_played_at: hoursFromNow(30),
      },
      {
        match_id: 1,
        home_team_name: 'A',
        away_team_name: 'B',
        match_played_at: hoursFromNow(10),
      },
      {
        match_id: 3,
        home_team_name: 'C',
        away_team_name: 'D',
        match_played_at: hoursFromNow(60),
      },
    ];
    const due = selectWantToGoNudgeMatches(matches, [1], NOW);
    assert.deepEqual(
      due.map((m) => m.match_id),
      [2],
    );
  });

  it('selectWantToGoPlayedNudgeMatches excluye Capsules y prioriza reciente', () => {
    const matches = [
      {
        match_id: 10,
        home_team_name: 'A',
        away_team_name: 'B',
        match_played_at: hoursFromNow(-48),
      },
      {
        match_id: 11,
        home_team_name: 'C',
        away_team_name: 'D',
        match_played_at: hoursFromNow(-6),
      },
      {
        match_id: 12,
        home_team_name: 'E',
        away_team_name: 'F',
        match_played_at: hoursFromNow(-3),
      },
    ];
    const due = selectWantToGoPlayedNudgeMatches(matches, [12], [], NOW);
    assert.deepEqual(
      due.map((m) => m.match_id),
      [11, 10],
    );
  });

  it('findWantToGoNudge prioriza upcoming sobre played', () => {
    const nudge = findWantToGoNudge(
      [
        {
          match_id: 10,
          home_team_name: 'Madrid',
          away_team_name: 'Barça',
          match_played_at: hoursFromNow(5),
          competition_name: 'LaLiga',
        },
        {
          match_id: 11,
          home_team_name: 'Sevilla',
          away_team_name: 'Betis',
          match_played_at: hoursFromNow(-8),
        },
      ],
      [],
      NOW,
      [],
    );
    assert.ok(nudge);
    assert.equal(nudge!.kind, 'upcoming');
    assert.equal(nudge!.matchId, 10);
    assert.match(nudge!.body, /Madrid–Barça/);
  });

  it('findWantToGoNudge cae a played sin Capsule', () => {
    const nudge = findWantToGoNudge(
      [
        {
          match_id: 20,
          home_team_name: 'Betis',
          away_team_name: 'Sevilla',
          match_played_at: hoursFromNow(-12),
          competition_name: 'LaLiga',
        },
        {
          match_id: 21,
          home_team_name: 'Valencia',
          away_team_name: 'Villarreal',
          match_played_at: hoursFromNow(-30),
        },
      ],
      [],
      NOW,
      [21],
    );
    assert.ok(nudge);
    assert.equal(nudge!.kind, 'played');
    assert.equal(nudge!.matchId, 20);
    assert.equal(nudge!.href, '/capsules/new');
    assert.equal(nudge!.hrefLabel, 'Guardar Capsule');
    assert.ok(nudge!.createMatch);
    assert.equal(nudge!.createMatch!.id, 20);
    assert.match(nudge!.title, /Ya jugó/);
  });
});
