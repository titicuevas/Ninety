import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { alsoLikedLabel, filterAlsoLikedPeople } from './collectionAlsoLiked.ts';

describe('collectionAlsoLiked', () => {
  it('filtra al dueño de la lista actual', () => {
    const people = [{ id: 'a' }, { id: 'b' }];
    assert.deepEqual(filterAlsoLikedPeople(people, 'a'), [{ id: 'b' }]);
    assert.deepEqual(filterAlsoLikedPeople(people, null), people);
  });

  it('etiqueta singular / plural', () => {
    assert.equal(alsoLikedLabel(1), 'También le gusta');
    assert.equal(alsoLikedLabel(2), 'También les gusta');
  });
});
