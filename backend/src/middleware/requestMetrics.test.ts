import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import { requestMetrics } from './requestMetrics.js';

describe('requestMetrics', () => {
  it('registra duración, ruta, estado e ID sin datos sensibles', async () => {
    const messages: string[] = [];
    const originalLog = console.log;
    console.log = (message?: unknown) => messages.push(String(message));

    try {
      const app = express();
      app.use((req, res, next) => {
        res.locals.requestId = req.get('x-request-id');
        next();
      });
      app.use(requestMetrics);
      app.get('/api/ping', (_req, res) => res.status(204).end());

      await request(app).get('/api/ping?token=should-not-log').set('X-Request-Id', 'test-request');

      const event = JSON.parse(messages[0]!) as Record<string, unknown>;
      assert.deepEqual(event, {
        event: 'http_request',
        request_id: 'test-request',
        method: 'GET',
        path: '/api/ping',
        status: 204,
        duration_ms: event.duration_ms,
      });
      assert.equal(typeof event.duration_ms, 'number');
      assert.doesNotMatch(messages[0]!, /should-not-log|token/i);
    } finally {
      console.log = originalLog;
    }
  });
});