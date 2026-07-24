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

  it('GET /api/football/teams/competitions requiere auth', async () => {
    const res = await request(createApp()).get('/api/football/teams/competitions?q=betis');
    assert.equal(res.status, 401);
  });

  it('GET /api/football/competitions/curated requiere auth', async () => {
    const res = await request(createApp()).get('/api/football/competitions/curated');
    assert.equal(res.status, 401);
  });

  it('GET /api/football/matches/search valida parámetros', async () => {
    const res = await request(createApp()).get('/api/football/matches/search');
    assert.equal(res.status, 401);
  });

  it('GET /api/profile/me requiere auth', async () => {
    const res = await request(createApp()).get('/api/profile/me');
    assert.equal(res.status, 401);
  });

  it('GET /api/capsules/me requiere auth', async () => {
    const res = await request(createApp()).get('/api/capsules/me');
    assert.equal(res.status, 401);
  });

  it('GET /api/capsules/feed requiere auth', async () => {
    const res = await request(createApp()).get('/api/capsules/feed');
    assert.equal(res.status, 401);
  });

  it('POST /api/capsules valida el body', async () => {
    const res = await request(createApp()).post('/api/capsules').send({});
    assert.equal(res.status, 401);
  });

  it('GET /api/capsules/:id no requiere auth', async () => {
    const res = await request(createApp()).get('/api/capsules/00000000-0000-4000-8000-000000000001');
    assert.notEqual(res.status, 401);
  });

  it('PATCH /api/capsules/:id requiere auth', async () => {
    const res = await request(createApp())
      .patch('/api/capsules/00000000-0000-4000-8000-000000000001')
      .send({ watched_at: '2025-01-01' });
    assert.equal(res.status, 401);
  });

  it('DELETE /api/capsules/:id requiere auth', async () => {
    const res = await request(createApp()).delete('/api/capsules/00000000-0000-4000-8000-000000000001');
    assert.equal(res.status, 401);
  });

  it('GET /api/capsules/user/:username no requiere auth', async () => {
    const res = await request(createApp()).get('/api/capsules/user/demo');
    assert.notEqual(res.status, 401);
  });

  it('POST /api/capsules/:id/like requiere auth', async () => {
    const res = await request(createApp()).post('/api/capsules/00000000-0000-4000-8000-000000000001/like');
    assert.equal(res.status, 401);
  });

  it('DELETE /api/capsules/:id/like requiere auth', async () => {
    const res = await request(createApp()).delete('/api/capsules/00000000-0000-4000-8000-000000000001/like');
    assert.equal(res.status, 401);
  });

  it('GET /api/capsules/:id/comments no requiere auth', async () => {
    const res = await request(createApp()).get('/api/capsules/00000000-0000-4000-8000-000000000001/comments');
    assert.notEqual(res.status, 401);
  });

  it('POST /api/auth/refresh valida el body', async () => {
    const res = await request(createApp()).post('/api/auth/refresh').send({});
    assert.equal(res.status, 400);
  });

  it('POST /api/capsules/:id/comments requiere auth', async () => {
    const res = await request(createApp())
      .post('/api/capsules/00000000-0000-4000-8000-000000000001/comments')
      .send({ body: 'Hola' });
    assert.equal(res.status, 401);
  });

  it('GET /api/profile/search requiere auth', async () => {
    const res = await request(createApp()).get('/api/profile/search?q=beta');
    assert.equal(res.status, 401);
  });

  it('POST /api/profile/:username/follow requiere auth', async () => {
    const res = await request(createApp()).post('/api/profile/demo/follow');
    assert.equal(res.status, 401);
  });

  it('DELETE /api/profile/:username/follow requiere auth', async () => {
    const res = await request(createApp()).delete('/api/profile/demo/follow');
    assert.equal(res.status, 401);
  });

  it('POST /api/auth/login valida el body', async () => {
    const res = await request(createApp()).post('/api/auth/login').send({});
    assert.equal(res.status, 400);
  });

  it('GET / responde página de bienvenida', async () => {
    const res = await request(createApp()).get('/');
    assert.equal(res.status, 200);
    assert.match(res.text, /Ninety API/);
    assert.match(res.text, /Ir a Ninety/);
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
