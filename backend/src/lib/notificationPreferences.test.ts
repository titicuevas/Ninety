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

  it('mapea columnas DB a claves de tipo', () => {
    assert.deepEqual(
      mapNotificationPreferencesRow({
        likes_enabled: false,
        comments_enabled: true,
        follows_enabled: false,
      }),
      { like: false, comment: true, follow: false },
    );
  });

  it('trata nullish como activado', () => {
    assert.deepEqual(
      mapNotificationPreferencesRow({
        likes_enabled: null as unknown as boolean,
        comments_enabled: undefined as unknown as boolean,
        follows_enabled: true,
      }),
      { like: true, comment: true, follow: true },
    );
  });
});

describe('isNotificationTypeEnabled', () => {
  it('respeta silenciados por tipo', () => {
    const prefs = { like: false, comment: true, follow: true };
    assert.equal(isNotificationTypeEnabled(prefs, 'like'), false);
    assert.equal(isNotificationTypeEnabled(prefs, 'comment'), true);
    assert.equal(isNotificationTypeEnabled(prefs, 'follow'), true);
  });
});
