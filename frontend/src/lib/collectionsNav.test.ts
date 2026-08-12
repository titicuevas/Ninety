import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isCollectionsExplorePath,
  isCollectionsMinePath,
  isCollectionsSectionPath,
} from './collectionsNav.ts';

describe('collectionsNav', () => {
  it('detecta la sección colecciones', () => {
    assert.equal(isCollectionsSectionPath('/collections'), true);
    assert.equal(isCollectionsSectionPath('/collections/explore'), true);
    assert.equal(isCollectionsSectionPath('/collections/abc'), true);
    assert.equal(isCollectionsSectionPath('/feed'), false);
    assert.equal(isCollectionsSectionPath('/collection'), false);
  });

  it('separa Mis listas vs Explorar', () => {
    assert.equal(isCollectionsMinePath('/collections'), true);
    assert.equal(isCollectionsMinePath('/collections/uuid'), true);
    assert.equal(isCollectionsMinePath('/collections/explore'), false);
    assert.equal(isCollectionsExplorePath('/collections/explore'), true);
    assert.equal(isCollectionsExplorePath('/collections'), false);
  });
});
