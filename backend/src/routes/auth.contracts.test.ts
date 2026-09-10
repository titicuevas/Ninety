import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  loginSchema,
  oauthExchangeSchema,
  passwordSchema,
  registerSchema,
  verifyEmailSchema,
} from './auth.contracts.js';

describe('auth contracts', () => {
  it('acepta login corto y registro con ≥10 caracteres', () => {
    assert.equal(loginSchema.safeParse({ email: 'user@example.com', password: '123456' }).success, true);
    assert.equal(
      registerSchema.safeParse({
        email: 'user@example.com',
        password: '1234567890',
        display_name: 'Ninety',
      }).success,
      true,
    );
    assert.equal(
      registerSchema.safeParse({
        email: 'user@example.com',
        password: '123456',
        display_name: 'Ninety',
      }).success,
      false,
    );
  });
  it('rechaza contraseñas cortas en reset/cambio y PKCE inválidos', () => {
    assert.equal(passwordSchema.safeParse({ password: '123456789' }).success, false);
    assert.equal(passwordSchema.safeParse({ password: '1234567890' }).success, true);
    assert.equal(oauthExchangeSchema.safeParse({ code: 'code', pkceId: 'bad' }).success, false);
  });
  it('limita los tipos admitidos al verificar email', () => {
    assert.equal(verifyEmailSchema.safeParse({ token_hash: 'token', type: 'signup' }).success, true);
    assert.equal(verifyEmailSchema.safeParse({ token_hash: 'token', type: 'admin' }).success, false);
  });
});
