import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { friendlyRecoveryError, parseRecoveryParams } from './recoveryToken.ts';

describe('parseRecoveryParams', () => {
  it('lee access_token del hash con type=recovery', () => {
    const result = parseRecoveryParams('', '#access_token=tok123&type=recovery');
    assert.deepEqual(result, { ok: true, kind: 'access_token', accessToken: 'tok123' });
  });

  it('lee access_token de la query', () => {
    const result = parseRecoveryParams('?access_token=fromquery&type=recovery', '');
    assert.deepEqual(result, { ok: true, kind: 'access_token', accessToken: 'fromquery' });
  });

  it('lee token_hash de recovery', () => {
    const result = parseRecoveryParams('?token_hash=th123&type=recovery', '');
    assert.deepEqual(result, { ok: true, kind: 'token_hash', tokenHash: 'th123' });
  });

  it('prioriza error_description de la query', () => {
    const result = parseRecoveryParams(
      '?error=access_denied&error_description=Link%20expired',
      '#access_token=ignored&type=recovery',
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /caducado/i);
  });

  it('falla sin token', () => {
    const result = parseRecoveryParams('', '');
    assert.equal(result.ok, false);
  });

  it('rechaza type distinto de recovery', () => {
    const result = parseRecoveryParams('', '#access_token=x&type=signup');
    assert.equal(result.ok, false);
  });
});

describe('friendlyRecoveryError', () => {
  it('traduce Link expired', () => {
    assert.match(friendlyRecoveryError('Link expired'), /caducado/i);
  });
});
