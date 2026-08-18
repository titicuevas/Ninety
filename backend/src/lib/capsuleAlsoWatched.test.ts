import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assembleAlsoWatchedPeople,
  alsoWatchedPeopleForItem,
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

  it('omite al autor y recorta la tarjeta', () => {
    const profiles = [
      { id: 'owner', username: 'yo', display_name: 'Yo', avatar_url: null },
      { id: 'a', username: 'ana', display_name: 'Ana', avatar_url: null },
      { id: 'b', username: 'bea', display_name: 'Bea', avatar_url: null },
      { id: 'c', username: 'cia', display_name: 'Cia', avatar_url: null },
      { id: 'd', username: 'dia', display_name: 'Dia', avatar_url: null },
    ];
    const people = alsoWatchedPeopleForItem(
      [
        { id: 'cap-owner', user_id: 'owner' },
        { id: 'cap-a', user_id: 'a' },
        { id: 'cap-b', user_id: 'b' },
        { id: 'cap-c', user_id: 'c' },
        { id: 'cap-d', user_id: 'd' },
      ],
      profiles,
      'owner',
    );
    assert.equal(people.length, 3);
    assert.ok(people.every((person) => person.id !== 'owner'));
  });
});
