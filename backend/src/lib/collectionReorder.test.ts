import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCollectionReorder, moveCapsuleInOrder } from './collectionReorder.js';

const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const C = '00000000-0000-4000-8000-000000000003';
const D = '00000000-0000-4000-8000-000000000004';

describe('buildCollectionReorder', () => {
  it('asigna posiciones 0..n-1 cuando el conjunto coincide', () => {
    const result = buildCollectionReorder([A, B, C], [C, A, B]);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.positions, [
      { capsule_id: C, position: 0 },
      { capsule_id: A, position: 1 },
      { capsule_id: B, position: 2 },
    ]);
  });

  it('rechaza lista vacía', () => {
    const result = buildCollectionReorder([], []);
    assert.equal(result.ok, false);
  });

  it('rechaza si faltan o sobran Capsules', () => {
    assert.equal(buildCollectionReorder([A, B], [A]).ok, false);
    assert.equal(buildCollectionReorder([A, B], [A, B, C]).ok, false);
  });

  it('rechaza Capsules ajenas o duplicadas', () => {
    assert.equal(buildCollectionReorder([A, B], [A, D]).ok, false);
    assert.equal(buildCollectionReorder([A, B], [A, A]).ok, false);
  });
});

describe('moveCapsuleInOrder', () => {
  it('sube y baja dentro de límites', () => {
    assert.deepEqual(moveCapsuleInOrder([A, B, C], B, 'up'), [B, A, C]);
    assert.deepEqual(moveCapsuleInOrder([A, B, C], B, 'down'), [A, C, B]);
  });

  it('devuelve null en extremos o id desconocido', () => {
    assert.equal(moveCapsuleInOrder([A, B], A, 'up'), null);
    assert.equal(moveCapsuleInOrder([A, B], B, 'down'), null);
    assert.equal(moveCapsuleInOrder([A, B], D, 'up'), null);
  });
});
