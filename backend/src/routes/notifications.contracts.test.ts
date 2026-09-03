import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { notificationPreferencesPatchSchema, pushSubscribeSchema } from './notifications.contracts.js';

describe('notification contracts', () => {
  it('exige al menos una preferencia', () => {
    assert.equal(notificationPreferencesPatchSchema.safeParse({}).success, false);
    assert.equal(notificationPreferencesPatchSchema.safeParse({ like: false }).success, true);
  });
  it('valida horario silencioso', () => {
    assert.equal(notificationPreferencesPatchSchema.safeParse({ push_quiet: { start: '23:30' } }).success, true);
    assert.equal(notificationPreferencesPatchSchema.safeParse({ push_quiet: { start: '25:00' } }).success, false);
    assert.equal(notificationPreferencesPatchSchema.safeParse({ push_quiet: {} }).success, false);
  });
  it('valida suscripciones push completas', () => {
    assert.equal(pushSubscribeSchema.safeParse({ endpoint: 'https://push.example/1', keys: { p256dh: 'key', auth: 'auth' } }).success, true);
    assert.equal(pushSubscribeSchema.safeParse({ endpoint: 'bad', keys: {} }).success, false);
  });
});
