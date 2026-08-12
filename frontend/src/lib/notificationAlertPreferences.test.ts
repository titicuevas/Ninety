import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_NOTIFICATION_ALERT_PREFERENCES,
  isValidQuietHhMm,
  normalizeNotificationAlertPreferences,
  normalizePushQuietHours,
} from './notificationAlertPreferences.ts';

describe('normalizeNotificationAlertPreferences', () => {
  it('usa defaults si falta payload', () => {
    assert.deepEqual(normalizeNotificationAlertPreferences(null), DEFAULT_NOTIFICATION_ALERT_PREFERENCES);
    assert.deepEqual(
      normalizeNotificationAlertPreferences(undefined),
      DEFAULT_NOTIFICATION_ALERT_PREFERENCES,
    );
  });

  it('conserva silenciados explícitos, diary push y quiet hours', () => {
    assert.deepEqual(
      normalizeNotificationAlertPreferences({
        like: false,
        follow: true,
        push_anniversary: true,
        push_milestone: true,
        push_want_to_go: true,
        email_digest: true,
        push_quiet: { enabled: true, start: '23:00', end: '07:00', timezone: 'Europe/Madrid' },
      }),
      {
        like: false,
        comment: true,
        follow: true,
        push_anniversary: true,
        push_milestone: true,
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

  it('diary push, Quiero ir y email digest son opt-in (false si no vienen)', () => {
    assert.equal(normalizeNotificationAlertPreferences({ like: true }).push_anniversary, false);
    assert.equal(normalizeNotificationAlertPreferences({ like: true }).push_milestone, false);
    assert.equal(normalizeNotificationAlertPreferences({ like: true }).push_want_to_go, false);
    assert.equal(normalizeNotificationAlertPreferences({ like: true }).email_digest, false);
  });
});

describe('normalizePushQuietHours / isValidQuietHhMm', () => {
  it('valida HH:MM', () => {
    assert.equal(isValidQuietHhMm('22:00'), true);
    assert.equal(isValidQuietHhMm('9:00'), false);
  });

  it('defaults si falta', () => {
    assert.deepEqual(normalizePushQuietHours(null), {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC',
    });
  });
});
