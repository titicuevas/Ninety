import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import request from 'supertest';
import { setRuntimeReady } from './lib/runtimeHealth.js';

const TEST_ENV = {
  NODE_ENV: 'test',
  PORT: '3099',
  CLIENT_URL: 'http://localhost:5173',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  SUPABASE_SECRET_KEY: 'sb_secret_test',
  FOOTBALL_DATA_API_KEY: 'test-football-key',
};

describe('frontera HTTP de seguridad', () => {
  let createApp: () => import('express').Express;

  before(async () => {
    Object.assign(process.env, TEST_ENV);
    ({ createApp } = await import('./app.js'));
  });

  it('envía cabeceras defensivas y oculta Express', async () => {
    const res = await request(createApp()).get('/api/health');
    assert.equal(res.status, 200);
    assert.match(String(res.headers['content-security-policy']), /default-src 'self'/);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
    assert.equal(res.headers['referrer-policy'], 'no-referrer');
    assert.equal(res.headers['x-powered-by'], undefined);
  });

  it('genera o conserva request IDs seguros', async () => {
    const generated = await request(createApp()).get('/api/health');
    assert.match(String(generated.headers['x-request-id']), /^[0-9a-f-]{36}$/i);

    const forwarded = await request(createApp())
      .get('/api/health')
      .set('X-Request-Id', 'edge.trace_123');
    assert.equal(forwarded.headers['x-request-id'], 'edge.trace_123');

    const rejected = await request(createApp())
      .get('/api/health')
      .set('X-Request-Id', 'a'.repeat(65));
    assert.notEqual(rejected.headers['x-request-id'], 'a'.repeat(65));
    assert.match(String(rejected.headers['x-request-id']), /^[0-9a-f-]{36}$/i);
  });

  it('separa liveness y readiness', async () => {
    setRuntimeReady(false);
    const live = await request(createApp()).get('/api/health');
    const starting = await request(createApp()).get('/api/health/ready');
    assert.equal(live.status, 200);
    assert.equal(starting.status, 503);
    assert.equal(starting.body.status, 'starting');

    setRuntimeReady(true);
    const ready = await request(createApp()).get('/api/health/ready');
    assert.equal(ready.status, 200);
    assert.equal(ready.body.status, 'ready');
    setRuntimeReady(false);
  });

  it('autoriza el dominio oficial con credenciales', async () => {
    const res = await request(createApp())
      .get('/api/health')
      .set('Origin', 'https://www.getninety.app');
    assert.equal(res.headers['access-control-allow-origin'], 'https://www.getninety.app');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
  });

  it('no concede CORS a orígenes desconocidos', async () => {
    const res = await request(createApp())
      .get('/api/health')
      .set('Origin', 'https://attacker.invalid');
    assert.equal(res.headers['access-control-allow-origin'], undefined);
    assert.equal(res.headers['access-control-allow-credentials'], undefined);
  });

  it('no devuelve stack ni secretos ante autenticación inválida', async () => {
    const res = await request(createApp())
      .get('/api/football/competitions')
      .set('Authorization', 'Bearer invalid-token');
    const body = JSON.stringify(res.body);
    assert.equal(res.status, 401);
    assert.doesNotMatch(body, /stack|sb_secret|test-football-key|authorization/i);
  });
});
