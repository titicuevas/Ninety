import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isVisibleLikedCapsule,
  likedCapsulesPaging,
  orderCapsulesByLikedIds,
} from './capsuleLikes.js';

describe('likedCapsules helpers', () => {
  it('limita y saneea paginación', () => {
    assert.deepEqual(likedCapsulesPaging(undefined, undefined), { limit: 20, offset: 0 });
    assert.deepEqual(likedCapsulesPaging(3, 10), { limit: 3, offset: 10 });
    assert.deepEqual(likedCapsulesPaging(999, -4), { limit: 50, offset: 0 });
  });

  it('respeta públicas, propias y bloqueos', () => {
    const blocked = new Set(['blocked']);
    assert.equal(
      isVisibleLikedCapsule({ user_id: 'other', is_public: true }, 'me', blocked),
      true,
    );
    assert.equal(
      isVisibleLikedCapsule({ user_id: 'other', is_public: false }, 'me', blocked),
      false,
    );
    assert.equal(
      isVisibleLikedCapsule({ user_id: 'me', is_public: false }, 'me', blocked),
      true,
    );
    assert.equal(
      isVisibleLikedCapsule({ user_id: 'blocked', is_public: true }, 'me', blocked),
      false,
    );
  });

  it('conserva el orden de los likes', () => {
    const ordered = orderCapsulesByLikedIds(
      ['b', 'missing', 'a'],
      [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
    );
    assert.deepEqual(
      ordered.map((row) => row.id),
      ['b', 'a'],
    );
  });
});
