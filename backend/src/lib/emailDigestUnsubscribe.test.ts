import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  signEmailDigestUnsubscribe,
  verifyEmailDigestUnsubscribe,
} from './emailDigestUnsubscribe.js';

describe('emailDigestUnsubscribe', () => {
  it('firma y verifica', () => {
    process.env.CRON_SECRET = 'test-cron-secret-ok';
    const userId = '11111111-1111-4111-8111-111111111111';
    const sig = signEmailDigestUnsubscribe(userId);
    assert.ok(sig);
    assert.equal(verifyEmailDigestUnsubscribe(userId, sig!), true);
    assert.equal(verifyEmailDigestUnsubscribe(userId, '0'.repeat(sig!.length)), false);
  });
});
