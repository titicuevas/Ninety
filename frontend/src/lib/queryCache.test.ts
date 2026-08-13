import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isInfiniteQueryData, isProfilesList } from './queryCache';

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
