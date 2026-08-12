import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAccountDeleteEmailConfirmed, normalizeAccountEmail } from './deleteAccountConfirm.js';

describe('deleteAccount helpers', () => {
  it('normaliza email a minúsculas sin espacios', () => {
    assert.equal(normalizeAccountEmail('  Demo@Mail.COM  '), 'demo@mail.com');
  });

  it('acepta confirmación cuando el email coincide', () => {
    assert.equal(isAccountDeleteEmailConfirmed('user@example.com', 'user@example.com'), true);
    assert.equal(isAccountDeleteEmailConfirmed('User@Example.com', '  user@example.com  '), true);
  });

  it('rechaza confirmación incorrecta o vacía', () => {
    assert.equal(isAccountDeleteEmailConfirmed('user@example.com', 'otro@example.com'), false);
    assert.equal(isAccountDeleteEmailConfirmed('user@example.com', ''), false);
    assert.equal(isAccountDeleteEmailConfirmed(null, 'user@example.com'), false);
  });
});
