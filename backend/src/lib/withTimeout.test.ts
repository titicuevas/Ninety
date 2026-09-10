import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { withTimeout } from './withTimeout.js';

describe('withTimeout', () => {
  it('resuelve si la promesa gana', async () => {
    const value = await withTimeout(Promise.resolve(42), 200, 'test');
    assert.equal(value, 42);
  });

  it('rechaza si se agota el tiempo', async () => {
    await assert.rejects(
      () =>
        withTimeout(
          new Promise((resolve) => {
            setTimeout(() => resolve('late'), 200);
          }),
          30,
          'lento',
        ),
      /agotó el tiempo/i,
    );
  });
});
