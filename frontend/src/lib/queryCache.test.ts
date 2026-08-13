import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isCommentsList, isInfiniteQueryData, isProfilesList, mapInfinitePages } from './queryCache';

describe('isInfiniteQueryData', () => {
  it('acepta InfiniteData con pages', () => {
    assert.equal(isInfiniteQueryData({ pages: [{ notifications: [] }], pageParams: [0] }), true);
  });

  it('rechaza caches sin pages (push, prefs, muted)', () => {
    assert.equal(isInfiniteQueryData(undefined), false);
    assert.equal(isInfiniteQueryData(true), false);
    assert.equal(isInfiniteQueryData({ publicKey: 'x' }), false);
    assert.equal(isInfiniteQueryData({ usernames: ['a'] }), false);
  });
});

describe('isProfilesList', () => {
  it('acepta listas de perfiles', () => {
    assert.equal(isProfilesList({ profiles: [] }), true);
    assert.equal(isProfilesList({ profiles: [{ id: '1' }] }), true);
  });

  it('rechaza otros shapes', () => {
    assert.equal(isProfilesList(undefined), false);
    assert.equal(isProfilesList({ pages: [] }), false);
  });
});

describe('isCommentsList', () => {
  it('acepta listas de comentarios', () => {
    assert.equal(isCommentsList({ comments: [] }), true);
  });

  it('rechaza otros shapes', () => {
    assert.equal(isCommentsList({ pages: [] }), false);
    assert.equal(isCommentsList(undefined), false);
  });
});

describe('mapInfinitePages', () => {
  it('no toca caches sin pages', () => {
    const push = { publicKey: 'x' };
    assert.equal(mapInfinitePages(push, (p) => p), push);
    assert.equal(mapInfinitePages(undefined, (p) => p), undefined);
  });

  it('mapea pages de InfiniteData', () => {
    const next = mapInfinitePages<{ n: number }>(
      { pages: [{ n: 1 }, { n: 2 }], pageParams: [0, 1] },
      (page) => ({ n: page.n + 1 }),
    );
    assert.deepEqual(next, { pages: [{ n: 2 }, { n: 3 }], pageParams: [0, 1] });
  });
});
