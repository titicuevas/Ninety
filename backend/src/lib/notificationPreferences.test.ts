import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isNotificationTypeEnabled,
  mapNotificationPreferencesRow,
} from './notificationPreferences.js';

describe('mapNotificationPreferencesRow', () => {
  it('usa defaults si no hay fila', () => {
    assert.deepEqual(mapNotificationPreferencesRow(null), DEFAULT_NOTIFICATION_PREFERENCES);
    assert.deepEqual(mapNotificationPreferencesRow(undefined), DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('mapea columnas DB a claves de tipo + quiet hours', () => {
    assert.deepEqual(
      mapNotificationPreferencesRow({
        likes_enabled: false,
        comments_enabled: true,
        follows_enabled: false,
        push_anniversary_enabled: true,
        push_milestone_enabled: false,
        push_want_to_go_enabled: true,
        email_digest_enabled: true,
        push_quiet_enabled: true,
        push_quiet_start: '23:00:00',
        push_quiet_end: '07:00:00',
        push_quiet_timezone: 'Europe/Madrid',
      }),
      {
        like: false,
        comment: true,
        follow: false,
        push_anniversary: true,
        push_milestone: false,
        push_want_to_go: true,
        email_digest: true,
        push_quiet: {
          enabled: true,
          start: '23:00',
          end: '07:00',
          timezone: 'Europe/Madrid',
        },
      },
    );
  });

  it('trata nullish como activado y quiet off', () => {
    assert.deepEqual(
      mapNotificationPreferencesRow({
        likes_enabled: null as unknown as boolean,
        comments_enabled: undefined as unknown as boolean,
        follows_enabled: true,
      }),
      {
        like: true,
        comment: true,
        follow: true,
        push_anniversary: false,
        push_milestone: false,
        push_want_to_go: false,
        email_digest: false,
        push_quiet: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timezone: 'UTC',
        },
      },
    );
  });
});

describe('isNotificationTypeEnabled', () => {
  it('respeta silenciados por tipo', () => {
    const prefs = {
      like: false,
      comment: true,
      follow: true,
      push_anniversary: false,
      push_milestone: false,
      push_want_to_go: false,
      email_digest: false,
      push_quiet: DEFAULT_NOTIFICATION_PREFERENCES.push_quiet,
    };
    assert.equal(isNotificationTypeEnabled(prefs, 'like'), false);
    assert.equal(isNotificationTypeEnabled(prefs, 'comment'), true);
    assert.equal(isNotificationTypeEnabled(prefs, 'follow'), true);
    assert.equal(isNotificationTypeEnabled(prefs, 'mention'), true);
  });

  it('menciones respetan preferencia de comentarios', () => {
    const prefs = {
      like: true,
      comment: false,
      follow: true,
      push_anniversary: false,
      push_milestone: false,
      push_want_to_go: false,
      email_digest: false,
      push_quiet: DEFAULT_NOTIFICATION_PREFERENCES.push_quiet,
    };
    assert.equal(isNotificationTypeEnabled(prefs, 'mention'), false);
  });
});
