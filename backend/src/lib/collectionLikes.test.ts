import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canEngageCollectionLikes,
  collectionLikesMigrationHint,
  isMissingCollectionLikesTable,
  isVisibleLikedCollection,
  likedCollectionsPaging,
  orderCollectionsByLikedIds,
} from './collectionLikes.js';

describe('isMissingCollectionLikesTable', () => {
  it('detecta mensaje con collection_likes', () => {
    assert.equal(
      isMissingCollectionLikesTable({ message: 'Could not find the table public.collection_likes' }),
      true,
    );
  });

  it('ignora otros errores', () => {
    assert.equal(isMissingCollectionLikesTable({ message: 'permission denied' }), false);
  });
});

describe('collectionLikesMigrationHint', () => {
  it('apunta a la migración', () => {
    assert.match(collectionLikesMigrationHint(), /20250821120000_collection_likes/);
  });
});

describe('canEngageCollectionLikes', () => {
  const owner = 'owner-1';
  const other = 'user-2';

  it('permite colecciones públicas a cualquiera', () => {
    assert.equal(canEngageCollectionLikes({ user_id: owner, is_public: true }, undefined), true);
    assert.equal(canEngageCollectionLikes({ user_id: owner, is_public: true }, other), true);
  });

  it('solo el dueño en listas privadas', () => {
    assert.equal(canEngageCollectionLikes({ user_id: owner, is_public: false }, owner), true);
    assert.equal(canEngageCollectionLikes({ user_id: owner, is_public: false }, other), false);
    assert.equal(canEngageCollectionLikes({ user_id: owner, is_public: false }, undefined), false);
  });
});

describe('likedCollectionsPaging', () => {
  it('acota limit y offset', () => {
    assert.deepEqual(likedCollectionsPaging(), { limit: 20, offset: 0 });
    assert.deepEqual(likedCollectionsPaging(3, 10), { limit: 3, offset: 10 });
    assert.deepEqual(likedCollectionsPaging(999, -4), { limit: 50, offset: 0 });
  });
});

describe('isVisibleLikedCollection', () => {
  const blocked = new Set(['blocked']);

  it('muestra públicas ajenas y propias privadas', () => {
    assert.equal(
      isVisibleLikedCollection({ user_id: 'other', is_public: true }, 'me', blocked),
      true,
    );
    assert.equal(
      isVisibleLikedCollection({ user_id: 'other', is_public: false }, 'me', blocked),
      false,
    );
    assert.equal(
      isVisibleLikedCollection({ user_id: 'me', is_public: false }, 'me', blocked),
      true,
    );
    assert.equal(
      isVisibleLikedCollection({ user_id: 'blocked', is_public: true }, 'me', blocked),
      false,
    );
  });
});

describe('orderCollectionsByLikedIds', () => {
  it('respeta el orden de los likes', () => {
    const ordered = orderCollectionsByLikedIds(
      ['b', 'a'],
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
