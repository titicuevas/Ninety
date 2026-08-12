import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canEngageCollectionLikes,
  collectionLikesMigrationHint,
  isMissingCollectionLikesTable,
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
