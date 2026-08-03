import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from './api.ts';
import { isPublicProfileNotFound } from './publicProfileError.ts';

describe('isPublicProfileNotFound', () => {
  it('solo trata 404 como usuario inexistente', () => {
    assert.equal(isPublicProfileNotFound(new ApiError('Usuario no encontrado', 404)), true);
    assert.equal(isPublicProfileNotFound(new ApiError('Falló la red', 0)), false);
    assert.equal(isPublicProfileNotFound(new ApiError('Temporal', 503)), false);
    assert.equal(isPublicProfileNotFound(new Error('Usuario no encontrado')), false);
    assert.equal(isPublicProfileNotFound(null), false);
  });
});
