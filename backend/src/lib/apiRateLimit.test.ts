import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import {
  apiRateLimitMax,
  createApiRateLimiter,
  shouldSkipApiRateLimit,
} from './apiRateLimit.js';

describe('apiRateLimit', () => {
  it('en producción es más estricto que en local/test', () => {
    assert.equal(apiRateLimitMax('production'), 180);
    assert.equal(apiRateLimitMax('test'), 5_000);
    assert.equal(apiRateLimitMax('development'), 5_000);
  });

  it('salta health y cron interno', () => {
    assert.equal(shouldSkipApiRateLimit('/health'), true);
    assert.equal(shouldSkipApiRateLimit('/api/health'), true);
    assert.equal(shouldSkipApiRateLimit('/internal/cron/push-digest'), true);
    assert.equal(shouldSkipApiRateLimit('/api/internal/cron/email-digest'), true);
    assert.equal(shouldSkipApiRateLimit('/capsules/me'), false);
    assert.equal(shouldSkipApiRateLimit('/api/activity'), false);
  });

  it('responde 429 al superar el techo', async () => {
    const app = express();
    app.use('/api', createApiRateLimiter({ max: 2, windowMs: 60_000 }));
    app.get('/api/ping', (_req, res) => {
      res.json({ ok: true });
    });
    app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok' });
    });

    const agent = request(app);
    assert.equal((await agent.get('/api/ping')).status, 200);
    assert.equal((await agent.get('/api/ping')).status, 200);
    const limited = await agent.get('/api/ping');
    assert.equal(limited.status, 429);
    assert.match(String(limited.body.error), /Demasiadas peticiones/i);
    assert.equal((await agent.get('/api/health')).status, 200);
  });
});
