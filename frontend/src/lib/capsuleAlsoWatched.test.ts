import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { alsoWatchedLabel, filterAlsoWatchedPeople } from './capsuleAlsoWatched.ts';

describe('capsuleAlsoWatched', () => {
  it('filtra al autor de la Capsule actual', () => {
    const people = [{ id: 'a' }, { id: 'b' }];
    assert.deepEqual(filterAlsoWatchedPeople(people, 'a'), [{ id: 'b' }]);
    assert.deepEqual(filterAlsoWatchedPeople(people, null), people);
  });

  it('etiqueta singular / plural', () => {
    assert.equal(alsoWatchedLabel(1), 'También lo vio');
    assert.equal(alsoWatchedLabel(2), 'También lo vieron');
  });
});
