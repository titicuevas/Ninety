import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  bearerTokenFromAuthorization,
  firstRouteParam,
  getBearerToken,
} from './httpRequest.js';

describe('httpRequest', () => {
  it('extrae Bearer sin depender de mayúsculas o espacios', () => {
    assert.equal(bearerTokenFromAuthorization('Bearer token-123'), 'token-123');
    assert.equal(bearerTokenFromAuthorization('  bearer   token-123  '), 'token-123');
    assert.equal(getBearerToken({ headers: { authorization: 'BEARER abc' } }), 'abc');
  });

  it('rechaza cabeceras incompletas o con otro esquema', () => {
    assert.equal(bearerTokenFromAuthorization(undefined), null);
    assert.equal(bearerTokenFromAuthorization('Basic abc'), null);
    assert.equal(bearerTokenFromAuthorization('Bearer   '), null);
  });

  it('normaliza parámetros escalares y arrays de Express', () => {
    assert.equal(firstRouteParam('capsule-id'), 'capsule-id');
    assert.equal(firstRouteParam(['first', 'second']), 'first');
    assert.equal(firstRouteParam([]), '');
  });
});
