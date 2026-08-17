import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isCollectionsExplorePath,
  isCollectionsLikedPath,
  isCollectionsMinePath,
  isCollectionsSectionPath,
  isWantToGoPath,
} from './collectionsNav.ts';

describe('collectionsNav', () => {
  it('detecta la sección colecciones', () => {
    assert.equal(isCollectionsSectionPath('/collections'), true);
    assert.equal(isCollectionsSectionPath('/collections/explore'), true);
    assert.equal(isCollectionsSectionPath('/collections/abc'), true);
    assert.equal(isCollectionsSectionPath('/want-to-go'), true);
    assert.equal(isCollectionsSectionPath('/collections/likes'), true);
    assert.equal(isCollectionsSectionPath('/feed'), false);
    assert.equal(isCollectionsSectionPath('/collection'), false);
  });

  it('separa Mis listas vs Explorar vs Quiero ir', () => {
    assert.equal(isCollectionsMinePath('/collections'), true);
    assert.equal(isCollectionsMinePath('/collections/uuid'), true);
    assert.equal(isCollectionsMinePath('/collections/explore'), false);
    assert.equal(isCollectionsMinePath('/collections/likes'), false);
    assert.equal(isCollectionsMinePath('/want-to-go'), false);
    assert.equal(isCollectionsExplorePath('/collections/explore'), true);
    assert.equal(isCollectionsExplorePath('/collections/likes'), false);
    assert.equal(isCollectionsLikedPath('/collections/likes'), true);
    assert.equal(isCollectionsLikedPath('/collections'), false);
    assert.equal(isCollectionsExplorePath('/collections'), false);
    assert.equal(isWantToGoPath('/want-to-go'), true);
    assert.equal(isWantToGoPath('/collections'), false);
  });
});
