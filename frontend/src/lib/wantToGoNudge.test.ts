import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  findWantToGoNudge,
  isMatchInWantToGoNudgeWindow,
  selectWantToGoNudgeMatches,
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

  it('findWantToGoNudge construye copy con extras', () => {
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
          match_played_at: hoursFromNow(20),
        },
      ],
      [],
      NOW,
    );
    assert.ok(nudge);
    assert.equal(nudge!.matchId, 10);
    assert.equal(nudge!.extraCount, 1);
    assert.equal(nudge!.href, '/want-to-go');
    assert.match(nudge!.body, /Madrid–Barça/);
    assert.match(nudge!.body, /1 más/);
  });
});
