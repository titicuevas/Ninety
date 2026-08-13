import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertValidCollectionReplyParent,
  canEngageCollectionComments,
  collectionCommentRepliesMigrationHint,
  collectionCommentsMigrationHint,
  isMissingCollectionCommentParentId,
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
    assert.match(collectionCommentRepliesMigrationHint(), /20250828120000_collection_comment_replies/);
  });

  it('valida padre de respuesta', () => {
    assert.equal(
      isMissingCollectionCommentParentId({ message: "Could not find the 'parent_id' column" }),
      true,
    );
    assert.equal(
      assertValidCollectionReplyParent(
        { id: 'p1', collection_id: 'c1', parent_id: null },
        'c1',
      ),
      null,
    );
    assert.match(
      assertValidCollectionReplyParent(
        { id: 'p1', collection_id: 'c1', parent_id: 'other' },
        'c1',
      ) ?? '',
      /un nivel/i,
    );
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
