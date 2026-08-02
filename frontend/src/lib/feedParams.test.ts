import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  feedDocumentTitle,
  feedPath,
  feedSearchParams,
  parseFeedScope,
  parseFeedSort,
} from './feedParams.ts';

describe('parseFeedScope', () => {
  it('acepta explore; default following', () => {
    assert.equal(parseFeedScope('explore'), 'explore');
    assert.equal(parseFeedScope('following'), 'following');
    assert.equal(parseFeedScope(null), 'following');
    assert.equal(parseFeedScope(''), 'following');
    assert.equal(parseFeedScope('other'), 'following');
  });
});

describe('parseFeedSort', () => {
  it('acepta popular; default recent', () => {
    assert.equal(parseFeedSort('popular'), 'popular');
    assert.equal(parseFeedSort('recent'), 'recent');
    assert.equal(parseFeedSort(null), 'recent');
    assert.equal(parseFeedSort('hot'), 'recent');
  });
});

describe('feedSearchParams / feedPath', () => {
  it('omite defaults', () => {
    assert.equal(feedSearchParams('following', 'recent'), '');
    assert.equal(feedPath(), '/feed');
  });

  it('serializa solo valores no default', () => {
    assert.equal(feedSearchParams('explore', 'recent'), '?scope=explore');
    assert.equal(feedSearchParams('following', 'popular'), '?sort=popular');
    assert.equal(feedSearchParams('explore', 'popular'), '?scope=explore&sort=popular');
    assert.equal(feedPath('explore', 'popular'), '/feed?scope=explore&sort=popular');
  });
});

describe('feedDocumentTitle', () => {
  it('refleja alcance y orden', () => {
    assert.equal(feedDocumentTitle('following', 'recent'), 'Feed');
    assert.equal(feedDocumentTitle('explore', 'recent'), 'Explorar');
    assert.equal(feedDocumentTitle('following', 'popular'), 'Feed · Populares');
    assert.equal(feedDocumentTitle('explore', 'popular'), 'Explorar · Populares');
  });
});
