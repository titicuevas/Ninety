import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIKES_PAGE_SIZE,
  buildCapsuleLikesQuery,
  formatLikesCountLabel,
  formatLikesPanelTitle,
  nextLikedPageOffset,
} from './capsuleLikes.ts';

describe('buildCapsuleLikesQuery', () => {
  it('pagina likes con limit y offset', () => {
    assert.equal(buildCapsuleLikesQuery(0), `limit=${LIKES_PAGE_SIZE}&offset=0`);
    assert.equal(buildCapsuleLikesQuery(40, 10), 'limit=10&offset=40');
    assert.equal(buildCapsuleLikesQuery(-5), `limit=${LIKES_PAGE_SIZE}&offset=0`);
  });
});

describe('formatLikesCountLabel', () => {
  it('muestra Me gusta o el número', () => {
    assert.equal(formatLikesCountLabel(0), 'Me gusta');
    assert.equal(formatLikesCountLabel(3), '3');
  });
});

describe('formatLikesPanelTitle', () => {
  it('pluraliza el título del panel', () => {
    assert.equal(formatLikesPanelTitle(0), 'Me gusta');
    assert.equal(formatLikesPanelTitle(1), '1 me gusta');
    assert.equal(formatLikesPanelTitle(12), '12 me gusta');
  });
});

describe('nextLikedPageOffset', () => {
  it('avanza por offset de likes, no por ítems visibles', () => {
    assert.equal(nextLikedPageOffset({ offset: 0, limit: 20, total: 45 }), 20);
    assert.equal(nextLikedPageOffset({ offset: 40, limit: 20, total: 45 }), undefined);
    assert.equal(nextLikedPageOffset({ offset: 0, limit: 20, total: 0 }), undefined);
  });
});
