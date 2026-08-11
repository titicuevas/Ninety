import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatNotificationAriaLabel,
  formatNotificationMatch,
  formatNotificationMatchContext,
} from './notificationCapsule.ts';

describe('formatNotificationMatch / formatNotificationMatchContext', () => {
  it('formatea partido y competición', () => {
    assert.equal(
      formatNotificationMatch({ home_team_name: 'Betis', away_team_name: 'Sevilla' }),
      'Betis vs Sevilla',
    );
    assert.equal(
      formatNotificationMatchContext({
        home_team_name: 'Betis',
        away_team_name: 'Sevilla',
        competition_name: 'LaLiga',
      }),
      'Betis vs Sevilla · LaLiga',
    );
    assert.equal(
      formatNotificationMatchContext({
        home_team_name: 'Betis',
        away_team_name: 'Sevilla',
        competition_name: null,
      }),
      'Betis vs Sevilla',
    );
  });
});

describe('formatNotificationAriaLabel', () => {
  it('compone actor, acción, partido y snippet', () => {
    assert.equal(
      formatNotificationAriaLabel({
        actorName: 'Ana',
        actionText: 'le gustó tu cápsula',
        capsule: {
          id: 'c1',
          home_team_name: 'Betis',
          away_team_name: 'Sevilla',
          competition_name: 'LaLiga',
          thumb_url: null,
        },
      }),
      'Ana le gustó tu cápsula · Betis vs Sevilla · LaLiga',
    );

    assert.equal(
      formatNotificationAriaLabel({
        actorName: 'Ana',
        actionText: 'comentó en tu cápsula',
        capsule: {
          id: 'c1',
          home_team_name: 'Betis',
          away_team_name: 'Sevilla',
          competition_name: null,
          thumb_url: null,
        },
        snippet: 'Qué partidazo',
      }),
      'Ana comentó en tu cápsula · Betis vs Sevilla · «Qué partidazo»',
    );

    assert.equal(
      formatNotificationAriaLabel({
        actorName: '@ana',
        actionText: 'te empezó a seguir',
      }),
      '@ana te empezó a seguir',
    );

    assert.equal(
      formatNotificationAriaLabel({
        actorName: 'Ana',
        actionText: 'le gustó tu cápsula',
        unread: true,
      }),
      'Ana le gustó tu cápsula · sin leer',
    );
  });
});
