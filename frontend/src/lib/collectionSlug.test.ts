import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { slugifyCollectionName } from './collectionSlug.ts';

describe('slugifyCollectionName', () => {
  it('normaliza nombres típicos', () => {
    assert.equal(slugifyCollectionName('Clásicos'), 'clasicos');
    assert.equal(slugifyCollectionName('Noches de Champions'), 'noches-de-champions');
  });
});
