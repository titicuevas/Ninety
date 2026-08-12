import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isManualMatchId, isValidCapsuleMatchId } from './manualMatch.js';

describe('manualMatch', () => {
  it('isManualMatchId solo negativos', () => {
    assert.equal(isManualMatchId(-1), true);
    assert.equal(isManualMatchId(-42), true);
    assert.equal(isManualMatchId(1), false);
    assert.equal(isManualMatchId(0), false);
  });

  it('isValidCapsuleMatchId rechaza 0', () => {
    assert.equal(isValidCapsuleMatchId(42), true);
    assert.equal(isValidCapsuleMatchId(-7), true);
    assert.equal(isValidCapsuleMatchId(0), false);
    assert.equal(isValidCapsuleMatchId(1.5), false);
  });
});
