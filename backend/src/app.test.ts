import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';

const TEST_ENV = {
  NODE_ENV: 'test',
  PORT: '3099',
  CLIENT_URL: 'http://localhost:5173',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  SUPABASE_SECRET_KEY: 'sb_secret_test',
  FOOTBALL_DATA_API_KEY: 'test-football-key',
};

function setTestEnv() {
  for (const [key, value] of Object.entries(TEST_ENV)) {
    process.env[key] = value;
  }
}

describe('API', () => {
  let createApp: () => import('express').Express;

  before(async () => {
    setTestEnv();
    const mod = await import('./app.js');
    createApp = mod.createApp;
  });

  after(() => {
    setTestEnv();
  });

  it('GET /api/health responde ok', async () => {
    const res = await request(createApp()).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'ninety-api');
  });

  it('GET /api/football/competitions requiere auth', async () => {
    const res = await request(createApp()).get('/api/football/competitions');
    assert.equal(res.status, 401);
    assert.match(res.body.error, /Token/);
  });

  it('GET /api/profile/me requiere auth', async () => {
    const res = await request(createApp()).get('/api/profile/me');
    assert.equal(res.status, 401);
  });

  it('no expone secret keys en respuestas de error', async () => {
    const res = await request(createApp())
      .get('/api/football/competitions')
      .set('Authorization', 'Bearer invalid-token');

    const body = JSON.stringify(res.body);
    assert.doesNotMatch(body, /sb_secret/);
    assert.doesNotMatch(body, /test-football-key/);
  });
});
