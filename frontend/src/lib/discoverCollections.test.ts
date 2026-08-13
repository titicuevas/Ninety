import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { discoverCollectionMatchLabel } from './discoverCollections.ts';
import {
  hasDiscoverCollectionsSearch,
  parseDiscoverCollectionsQueryParam,
  parseDiscoverCollectionsSortParam,
} from './discoverCollectionsParams.ts';

describe('discoverCollectionMatchLabel', () => {
  it('mapea motivos de descubrimiento', () => {
    assert.equal(discoverCollectionMatchLabel('following'), 'Siguiendo');
    assert.equal(discoverCollectionMatchLabel('favorite_team'), 'Mismo equipo');
    assert.equal(discoverCollectionMatchLabel('active'), 'Activa');
    assert.equal(discoverCollectionMatchLabel(null), null);
  });
});

describe('discoverCollectionsParams', () => {
  it('parsea q/sort y detecta filtros activos', () => {
    assert.equal(parseDiscoverCollectionsSortParam('likes'), 'likes');
    assert.equal(parseDiscoverCollectionsSortParam(null), 'relevant');
    assert.equal(parseDiscoverCollectionsQueryParam('  Clásicos  '), 'Clásicos');
    assert.equal(hasDiscoverCollectionsSearch('', 'relevant'), false);
    assert.equal(hasDiscoverCollectionsSearch('betis', 'relevant'), true);
    assert.equal(hasDiscoverCollectionsSearch('', 'recent'), true);
  });
});
