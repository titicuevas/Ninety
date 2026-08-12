import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LIKES_PAGE_SIZE, buildCollectionLikesQuery } from './collectionLikes.ts';

describe('buildCollectionLikesQuery', () => {
  it('pagina likes con limit y offset', () => {
    assert.equal(buildCollectionLikesQuery(0), `limit=${LIKES_PAGE_SIZE}&offset=0`);
    assert.equal(buildCollectionLikesQuery(40, 10), 'limit=10&offset=40');
  });
});
