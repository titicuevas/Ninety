import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canEngageCollectionComments,
  collectionCommentsMigrationHint,
  isMissingCollectionCommentsTable,
} from './collectionComments.js';

describe('collectionComments', () => {
  it('detecta tabla ausente', () => {
    assert.equal(
      isMissingCollectionCommentsTable({
        message: 'Could not find the table public.collection_comments',
      }),
      true,
    );
  });

  it('hint de migración', () => {
    assert.match(collectionCommentsMigrationHint(), /20250825120000_collection_comments/);
  });

  it('permite comentarios en públicas', () => {
    assert.equal(
      canEngageCollectionComments({ user_id: 'owner', is_public: true }, 'other'),
      true,
    );
  });

  it('bloquea privadas ajenas', () => {
    assert.equal(
      canEngageCollectionComments({ user_id: 'owner', is_public: false }, 'other'),
      false,
    );
  });

  it('permite privadas propias', () => {
    assert.equal(
      canEngageCollectionComments({ user_id: 'owner', is_public: false }, 'owner'),
      true,
    );
  });
});
