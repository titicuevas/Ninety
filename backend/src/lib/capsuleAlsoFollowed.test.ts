import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { groupFollowedUserIdsByTarget } from './capsuleAlsoFollowed.js';

describe('groupFollowedUserIdsByTarget', () => {
  it('omite al dueño, duplicados y recorta la tarjeta', () => {
    const grouped = groupFollowedUserIdsByTarget(
      [
        { target_id: 'c1', user_id: 'owner' },
        { target_id: 'c1', user_id: 'a' },
        { target_id: 'c1', user_id: 'a' },
        { target_id: 'c1', user_id: 'b' },
        { target_id: 'c1', user_id: 'c' },
        { target_id: 'c1', user_id: 'd' },
        { target_id: 'c2', user_id: 'a' },
      ],
      new Map([
        ['c1', 'owner'],
        ['c2', 'other'],
      ]),
      3,
    );

    assert.deepEqual(grouped.get('c1'), ['a', 'b', 'c']);
    assert.deepEqual(grouped.get('c2'), ['a']);
    assert.equal(grouped.has('missing'), false);
  });

  it('ignora filas sin dueño conocido', () => {
    const grouped = groupFollowedUserIdsByTarget(
      [{ target_id: 'orphan', user_id: 'a' }],
      new Map([['c1', 'owner']]),
    );
    assert.equal(grouped.size, 0);
  });
});
