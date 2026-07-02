import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveEnv } from '../config/env.js';

describe('resolveEnv', () => {
  const base = {
    CLIENT_URL: 'http://localhost:5173',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  };

  it('resuelve publishable key como anon key', () => {
    const env = resolveEnv({ ...base, NODE_ENV: 'test' });
    assert.equal(env.SUPABASE_ANON_KEY, 'sb_publishable_test');
  });

  it('resuelve secret key como service role key', () => {
    const env = resolveEnv({
      ...base,
      NODE_ENV: 'test',
      SUPABASE_SECRET_KEY: 'sb_secret_test',
    });
    assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, 'sb_secret_test');
  });

  it('falla sin clave de Supabase', () => {
    assert.throws(() =>
      resolveEnv({
        CLIENT_URL: 'http://localhost:5173',
        SUPABASE_URL: 'https://test.supabase.co',
        NODE_ENV: 'test',
      }),
    );
  });

  it('permite football key vacía', () => {
    const env = resolveEnv({ ...base, NODE_ENV: 'test' });
    assert.equal(env.FOOTBALL_DATA_API_KEY, '');
  });
});
