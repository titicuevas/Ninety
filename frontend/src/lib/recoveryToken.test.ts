import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRecoveryParams } from './recoveryToken.ts';

describe('parseRecoveryParams', () => {
  it('lee access_token del hash con type=recovery', () => {
    const result = parseRecoveryParams('', '#access_token=tok123&type=recovery');
    assert.deepEqual(result, { ok: true, accessToken: 'tok123' });
  });

  it('lee access_token de la query', () => {
    const result = parseRecoveryParams('?access_token=fromquery&type=recovery', '');
    assert.deepEqual(result, { ok: true, accessToken: 'fromquery' });
  });

  it('prioriza error_description de la query', () => {
    const result = parseRecoveryParams(
      '?error=access_denied&error_description=Link%20expired',
      '#access_token=ignored&type=recovery',
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /Link expired/i);
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
