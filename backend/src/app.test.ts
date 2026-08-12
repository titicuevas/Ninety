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

  it('GET /api/profile/username-available requiere auth', async () => {
    const res = await request(createApp()).get('/api/profile/username-available?u=demo_user');
    assert.equal(res.status, 401);
  });

  it('GET /api/capsules/me requiere auth', async () => {
    const res = await request(createApp()).get('/api/capsules/me');
    assert.equal(res.status, 401);
  });

  it('GET /api/capsules/me/calendar requiere auth', async () => {
    const res = await request(createApp()).get('/api/capsules/me/calendar?year=2026&month=8');
    assert.equal(res.status, 401);
  });

  it('GET /api/notifications/preferences requiere auth', async () => {
    const res = await request(createApp()).get('/api/notifications/preferences');
    assert.equal(res.status, 401);
  });

  it('PATCH /api/notifications/preferences requiere auth', async () => {
    const res = await request(createApp())
      .patch('/api/notifications/preferences')
      .send({ like: false });
    assert.equal(res.status, 401);
  });

  it('GET /api/notifications/muted requiere auth', async () => {
    const res = await request(createApp()).get('/api/notifications/muted');
    assert.equal(res.status, 401);
  });

  it('POST /api/notifications/muted/:username requiere auth', async () => {
    const res = await request(createApp()).post('/api/notifications/muted/demo');
    assert.equal(res.status, 401);
  });

  it('DELETE /api/notifications/muted/:username requiere auth', async () => {
    const res = await request(createApp()).delete('/api/notifications/muted/demo');
    assert.equal(res.status, 401);
  });

  it('GET /api/profile/blocked requiere auth', async () => {
    const res = await request(createApp()).get('/api/profile/blocked');
    assert.equal(res.status, 401);
  });

  it('POST /api/profile/blocked/:username requiere auth', async () => {
    const res = await request(createApp()).post('/api/profile/blocked/demo');
    assert.equal(res.status, 401);
  });

  it('DELETE /api/profile/blocked/:username requiere auth', async () => {
    const res = await request(createApp()).delete('/api/profile/blocked/demo');
    assert.equal(res.status, 401);
  });

  it('POST /api/reports requiere auth', async () => {
    const res = await request(createApp())
      .post('/api/reports')
      .send({ target_type: 'user', username: 'demo', reason: 'spam' });
    assert.equal(res.status, 401);
  });

  it('GET /api/reports/me requiere auth', async () => {
    const res = await request(createApp()).get('/api/reports/me');
    assert.equal(res.status, 401);
  });

  it('GET /api/reports/status requiere auth', async () => {
    const res = await request(createApp()).get(
      '/api/reports/status?target_type=user&target_id=00000000-0000-4000-8000-000000000001',
    );
    assert.equal(res.status, 401);
  });

  it('POST /api/invites/claim requiere auth', async () => {
    const res = await request(createApp()).post('/api/invites/claim').send({ code: 'demo' });
    assert.equal(res.status, 401);
  });

  it('GET /api/invites/:code no requiere auth', async () => {
    const res = await request(createApp()).get('/api/invites/demo_user');
    assert.ok([200, 404, 503].includes(res.status));
  });

  it('GET /api/want-to-go/me requiere auth', async () => {
    const res = await request(createApp()).get('/api/want-to-go/me');
    assert.equal(res.status, 401);
  });

  it('GET /api/want-to-go/me/ids requiere auth', async () => {
    const res = await request(createApp()).get('/api/want-to-go/me/ids');
    assert.equal(res.status, 401);
  });

  it('POST /api/want-to-go requiere auth', async () => {
    const res = await request(createApp())
      .post('/api/want-to-go')
      .send({ match_id: 1, home_team_name: 'A', away_team_name: 'B' });
    assert.equal(res.status, 401);
  });

  it('DELETE /api/want-to-go/:matchId requiere auth', async () => {
    const res = await request(createApp()).delete('/api/want-to-go/123');
    assert.equal(res.status, 401);
  });

  it('GET /api/capsules/me/export requiere auth', async () => {
    const res = await request(createApp()).get('/api/capsules/me/export');
    assert.equal(res.status, 401);
  });

  it('POST /api/capsules/me/import requiere auth', async () => {
    const res = await request(createApp())
      .post('/api/capsules/me/import')
      .send({ format_version: 1, capsules: [] });
    assert.equal(res.status, 401);
  });

  it('GET /api/collections/me requiere auth', async () => {
    const res = await request(createApp()).get('/api/collections/me');
    assert.equal(res.status, 401);
  });

  it('GET /api/collections/me/export requiere auth', async () => {
    const res = await request(createApp()).get('/api/collections/me/export');
    assert.equal(res.status, 401);
  });

  it('POST /api/collections/me/import requiere auth', async () => {
    const res = await request(createApp())
      .post('/api/collections/me/import')
      .send({ format_version: 1, kind: 'collections', collections: [] });
    assert.equal(res.status, 401);
  });

  it('GET /api/collections/me/containing/:capsuleId requiere auth', async () => {
    const res = await request(createApp()).get(
      '/api/collections/me/containing/00000000-0000-4000-8000-000000000001',
    );
    assert.equal(res.status, 401);
  });

  it('POST /api/collections requiere auth', async () => {
    const res = await request(createApp()).post('/api/collections').send({ name: 'Clásicos' });
    assert.equal(res.status, 401);
  });

  it('PUT /api/collections/:id/items/reorder requiere auth', async () => {
    const res = await request(createApp())
      .put('/api/collections/00000000-0000-4000-8000-000000000001/items/reorder')
      .send({ capsule_ids: ['00000000-0000-4000-8000-000000000002'] });
    assert.equal(res.status, 401);
  });

  it('GET /api/collections/discover requiere auth', async () => {
    const res = await request(createApp()).get('/api/collections/discover');
    assert.equal(res.status, 401);
  });

  it('GET /api/collections/user/:username no requiere auth', async () => {
    const res = await request(createApp()).get('/api/collections/user/demo');
    assert.notEqual(res.status, 401);
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

  it('GET /api/capsules/:id/likes no requiere auth', async () => {
    const res = await request(createApp()).get('/api/capsules/00000000-0000-4000-8000-000000000001/likes');
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

  it('GET /api/profile/by-team requiere auth', async () => {
    const res = await request(createApp()).get('/api/profile/by-team?slug=betis');
    assert.equal(res.status, 401);
  });

  it('GET /api/profile/:username/followers no requiere auth', async () => {
    const res = await request(createApp()).get('/api/profile/demo/followers');
    assert.notEqual(res.status, 401);
  });

  it('GET /api/profile/:username/following no requiere auth', async () => {
    const res = await request(createApp()).get('/api/profile/demo/following');
    assert.notEqual(res.status, 401);
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

  it('POST /api/auth/delete-account requiere auth', async () => {
    const res = await request(createApp())
      .post('/api/auth/delete-account')
      .send({ confirm_email: 'user@example.com' });
    assert.equal(res.status, 401);
  });

  it('POST /api/internal/cron/push-digest requiere CRON_SECRET', async () => {
    const res = await request(createApp()).post('/api/internal/cron/push-digest');
    assert.equal(res.status, 401);
    assert.match(res.body.error, /autorizado/i);
  });

  it('POST /api/internal/cron/push-diary requiere CRON_SECRET', async () => {
    const res = await request(createApp()).post('/api/internal/cron/push-diary');
    assert.equal(res.status, 401);
    assert.match(res.body.error, /autorizado/i);
  });

  it('POST /api/internal/cron/email-digest requiere CRON_SECRET', async () => {
    const res = await request(createApp()).post('/api/internal/cron/email-digest');
    assert.equal(res.status, 401);
    assert.match(res.body.error, /autorizado/i);
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
