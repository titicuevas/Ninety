import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildWantToGoPushPayload,
  isMatchInWantToGoReminderWindow,
  selectWantToGoMatchesDue,
  wantToGoEventKey,
  WANT_TO_GO_REMINDER_WINDOW_MS,
} from './wantToGoPushBuild.js';

describe('wantToGoEventKey', () => {
  it('usa match_id como clave', () => {
    assert.equal(wantToGoEventKey(42), '42');
  });
});

describe('isMatchInWantToGoReminderWindow', () => {
  const now = new Date('2026-08-12T12:00:00.000Z');

  it('false sin fecha o pasados', () => {
    assert.equal(isMatchInWantToGoReminderWindow(null, now), false);
    assert.equal(isMatchInWantToGoReminderWindow('2026-08-12T11:00:00.000Z', now), false);
  });

  it('true dentro de 48 h', () => {
    assert.equal(
      isMatchInWantToGoReminderWindow('2026-08-13T12:00:00.000Z', now),
      true,
    );
    assert.equal(
      isMatchInWantToGoReminderWindow(
        new Date(now.getTime() + WANT_TO_GO_REMINDER_WINDOW_MS).toISOString(),
        now,
      ),
      true,
    );
  });

  it('false fuera de ventana', () => {
    assert.equal(
      isMatchInWantToGoReminderWindow('2026-08-15T12:00:00.000Z', now),
      false,
    );
  });
});

describe('selectWantToGoMatchesDue', () => {
  const now = new Date('2026-08-12T12:00:00.000Z');

  it('ordena por kickoff, excluye ya enviados y limita', () => {
    const due = selectWantToGoMatchesDue(
      [
        {
          match_id: 3,
          home_team_name: 'C',
          away_team_name: 'D',
          match_played_at: '2026-08-13T18:00:00.000Z',
        },
        {
          match_id: 1,
          home_team_name: 'A',
          away_team_name: 'B',
          match_played_at: '2026-08-12T20:00:00.000Z',
        },
        {
          match_id: 2,
          home_team_name: 'E',
          away_team_name: 'F',
          match_played_at: '2026-08-12T16:00:00.000Z',
        },
        {
          match_id: 9,
          home_team_name: 'X',
          away_team_name: 'Y',
          match_played_at: '2026-08-20T12:00:00.000Z',
        },
      ],
      now,
      new Set(['2']),
      { limit: 2 },
    );
    assert.deepEqual(
      due.map((m) => m.match_id),
      [1, 3],
    );
  });
});

describe('buildWantToGoPushPayload', () => {
  it('deep link a /want-to-go', () => {
    const now = new Date('2026-08-12T12:00:00.000Z');
    const payload = buildWantToGoPushPayload(
      {
        match_id: 99,
        home_team_name: 'Barça',
        away_team_name: 'Madrid',
        match_played_at: '2026-08-13T19:00:00.000Z',
        competition_name: 'LaLiga',
      },
      now,
      'UTC',
    );
    assert.equal(payload.url, '/want-to-go');
    assert.match(payload.title, /Quiero ir/i);
    assert.match(payload.body, /Barça–Madrid/);
    assert.match(payload.body, /LaLiga/);
  });
});
