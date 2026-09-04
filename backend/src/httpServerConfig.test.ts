import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  HTTP_HEADERS_TIMEOUT_MS,
  HTTP_KEEP_ALIVE_TIMEOUT_MS,
  HTTP_REQUEST_TIMEOUT_MS,
} from './httpServerConfig.js';

describe('configuración del servidor HTTP', () => {
  it('define límites contra conexiones lentas o colgadas', () => {
    assert.equal(HTTP_HEADERS_TIMEOUT_MS, 15_000);
    assert.equal(HTTP_REQUEST_TIMEOUT_MS, 30_000);
    assert.equal(HTTP_KEEP_ALIVE_TIMEOUT_MS, 5_000);
    assert.ok(HTTP_HEADERS_TIMEOUT_MS < HTTP_REQUEST_TIMEOUT_MS);
  });
});