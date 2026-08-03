import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeAuthCallback, parseAuthEmailCallback } from './authEmailCallback.ts';

describe('parseAuthEmailCallback', () => {
  it('lee tokens de confirmación en el hash', () => {
    const result = parseAuthEmailCallback(
      '',
      '#access_token=at&refresh_token=rt&type=signup',
    );
    assert.deepEqual(result, {
      kind: 'tokens',
      accessToken: 'at',
      refreshToken: 'rt',
      type: 'signup',
    });
  });

  it('lee token_hash + type en la query', () => {
    const result = parseAuthEmailCallback('?token_hash=th123&type=signup', '');
    assert.deepEqual(result, {
      kind: 'token_hash',
      tokenHash: 'th123',
      type: 'signup',
    });
  });

  it('lee code OAuth/PKCE', () => {
    const result = parseAuthEmailCallback('?code=abc', '');
    assert.deepEqual(result, { kind: 'code', code: 'abc' });
  });

  it('prioriza error_description', () => {
    const result = parseAuthEmailCallback(
      '?error=access_denied&error_description=Expired',
      '#access_token=x&refresh_token=y',
    );
    assert.deepEqual(result, { kind: 'error', message: 'Expired' });
  });

  it('devuelve empty sin params útiles', () => {
    assert.equal(parseAuthEmailCallback('', '').kind, 'empty');
  });
});

describe('looksLikeAuthCallback', () => {
  it('detecta hash de signup', () => {
    assert.equal(looksLikeAuthCallback('', '#access_token=a&refresh_token=b&type=signup'), true);
  });

  it('ignora URLs normales', () => {
    assert.equal(looksLikeAuthCallback('?utm=1', '#section'), false);
  });
});
