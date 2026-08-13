import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FollowMutationError, followRelationFlags } from './userFollows.js';

describe('followRelationFlags', () => {
  it('ambos false sin viewer o si es el mismo perfil', () => {
    const followed = new Set(['a']);
    const followers = new Set(['a']);
    assert.deepEqual(followRelationFlags('a', '', followed, followers), {
      followed_by_me: false,
      follows_me: false,
    });
    assert.deepEqual(followRelationFlags('a', 'a', followed, followers), {
      followed_by_me: false,
      follows_me: false,
    });
  });

  it('marca followed_by_me y follows_me por separado', () => {
    const followed = new Set(['bob']);
    const followers = new Set(['carol']);
    assert.deepEqual(followRelationFlags('bob', 'alice', followed, followers), {
      followed_by_me: true,
      follows_me: false,
    });
    assert.deepEqual(followRelationFlags('carol', 'alice', followed, followers), {
      followed_by_me: false,
      follows_me: true,
    });
    assert.deepEqual(
      followRelationFlags('dave', 'alice', new Set(['dave']), new Set(['dave'])),
      { followed_by_me: true, follows_me: true },
    );
  });
});

describe('FollowMutationError', () => {
  it('conserva status HTTP', () => {
    const err = new FollowMutationError('No puedes seguirte a ti mismo', 400);
    assert.equal(err.status, 400);
    assert.equal(err.message, 'No puedes seguirte a ti mismo');
  });
});
