import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isMissingMutesTable } from './notificationMutes.js';

describe('isMissingMutesTable', () => {
  it('detecta tabla ausente por código 42P01', () => {
    assert.equal(isMissingMutesTable({ code: '42P01', message: 'relation does not exist' }), true);
  });

  it('detecta mensaje con notification_mutes', () => {
    assert.equal(
      isMissingMutesTable({ message: 'Could not find the table public.notification_mutes' }),
      true,
    );
  });

  it('no marca errores ajenos', () => {
    assert.equal(isMissingMutesTable({ code: '23505', message: 'duplicate key' }), false);
    assert.equal(isMissingMutesTable(new Error('network')), false);
  });
});
