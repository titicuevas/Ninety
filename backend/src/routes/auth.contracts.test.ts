import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loginSchema, oauthExchangeSchema, passwordSchema, registerSchema, verifyEmailSchema } from './auth.contracts.js';

describe('auth contracts', () => {
  it('acepta credenciales y registro válidos', () => {
    assert.equal(loginSchema.safeParse({ email: 'user@example.com', password: '123456' }).success, true);
    assert.equal(registerSchema.safeParse({ email: 'user@example.com', password: '123456', display_name: 'Ninety' }).success, true);
  });
  it('rechaza contraseñas y PKCE inválidos', () => {
    assert.equal(passwordSchema.safeParse({ password: '12345' }).success, false);
    assert.equal(oauthExchangeSchema.safeParse({ code: 'code', pkceId: 'bad' }).success, false);
  });
  it('limita los tipos admitidos al verificar email', () => {
    assert.equal(verifyEmailSchema.safeParse({ token_hash: 'token', type: 'signup' }).success, true);
    assert.equal(verifyEmailSchema.safeParse({ token_hash: 'token', type: 'admin' }).success, false);
  });
});
