import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isCapsulesSectionPath, isLikesPath } from './capsulesNav.ts';

describe('capsulesNav', () => {
  it('agrupa diario, me gusta y calendario', () => {
    assert.equal(isCapsulesSectionPath('/capsules'), true);
    assert.equal(isCapsulesSectionPath('/capsules/new'), true);
    assert.equal(isCapsulesSectionPath('/likes'), true);
    assert.equal(isCapsulesSectionPath('/diary/calendar'), true);
    assert.equal(isCapsulesSectionPath('/feed'), false);
  });

  it('detecta /likes', () => {
    assert.equal(isLikesPath('/likes'), true);
    assert.equal(isLikesPath('/capsules'), false);
  });
});
