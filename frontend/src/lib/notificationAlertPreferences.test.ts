import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_NOTIFICATION_ALERT_PREFERENCES,
  normalizeNotificationAlertPreferences,
} from './notificationAlertPreferences.ts';

describe('normalizeNotificationAlertPreferences', () => {
  it('usa defaults si falta payload', () => {
    assert.deepEqual(normalizeNotificationAlertPreferences(null), DEFAULT_NOTIFICATION_ALERT_PREFERENCES);
    assert.deepEqual(
      normalizeNotificationAlertPreferences(undefined),
      DEFAULT_NOTIFICATION_ALERT_PREFERENCES,
    );
  });

  it('conserva silenciados explícitos', () => {
    assert.deepEqual(normalizeNotificationAlertPreferences({ like: false, follow: true }), {
      like: false,
      comment: true,
      follow: true,
    });
  });
});
