import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assembleAlsoWatchedPeople,
  candidateAlsoWatchedIds,
} from './capsuleAlsoWatched.js';

describe('capsuleAlsoWatched helpers', () => {
  it('omite self, bloqueos y lista vacía', () => {
    assert.deepEqual(candidateAlsoWatchedIds(null, new Set(), 'me'), []);
    assert.deepEqual(candidateAlsoWatchedIds([], new Set(), 'me'), []);
    assert.deepEqual(
      candidateAlsoWatchedIds(['me', 'a', 'b'], new Set(['b']), 'me'),
      ['a'],
    );
  });

  it('arma perfiles con enlace a Capsule y ordena por nombre', () => {
    const people = assembleAlsoWatchedPeople(
      [
        { id: 'cap-z', user_id: 'z' },
        { id: 'cap-a', user_id: 'a' },
        { id: 'cap-dup', user_id: 'a' },
        { id: 'cap-missing', user_id: 'gone' },
      ],
      [
        {
          id: 'z',
          username: 'zeta',
          full_name: 'Zeta',
          avatar_url: null,
        },
        {
          id: 'a',
          username: 'ana',
          display_name: 'Ana',
          avatar_url: 'https://example.com/a.png',
        },
      ],
    );

    assert.equal(people.length, 2);
    assert.equal(people[0]?.id, 'a');
    assert.equal(people[0]?.capsule_id, 'cap-a');
    assert.equal(people[0]?.display_name, 'Ana');
    assert.equal(people[1]?.id, 'z');
    assert.equal(people[1]?.display_name, 'Zeta');
  });
});
