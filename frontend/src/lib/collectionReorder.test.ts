import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { moveCapsuleInOrder } from './collectionReorder.ts';

const A = 'a';
const B = 'b';
const C = 'c';

describe('moveCapsuleInOrder', () => {
  it('sube y baja dentro de límites', () => {
    assert.deepEqual(moveCapsuleInOrder([A, B, C], B, 'up'), [B, A, C]);
    assert.deepEqual(moveCapsuleInOrder([A, B, C], B, 'down'), [A, C, B]);
  });

  it('devuelve null en extremos', () => {
    assert.equal(moveCapsuleInOrder([A, B], A, 'up'), null);
    assert.equal(moveCapsuleInOrder([A, B], B, 'down'), null);
  });
});
