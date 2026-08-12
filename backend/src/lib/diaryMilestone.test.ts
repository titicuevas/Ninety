import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeDiaryMilestone,
  DIARY_MILESTONE_THRESHOLDS,
  thresholdsToCelebrate,
} from './diaryMilestone.js';

describe('computeDiaryMilestone', () => {
  it('null si no hay total o todo celebrado', () => {
    assert.equal(computeDiaryMilestone(0), null);
    assert.equal(computeDiaryMilestone(4), null);
    assert.equal(computeDiaryMilestone(100, DIARY_MILESTONE_THRESHOLDS), null);
  });

  it('elige el umbral más alto pendiente', () => {
    const m = computeDiaryMilestone(27, [5, 10]);
    assert.ok(m);
    assert.equal(m.threshold, 25);
    assert.equal(m.totalMatches, 27);
    assert.equal(m.href, '/capsules');
  });
});

describe('thresholdsToCelebrate', () => {
  it('marca todos los ≤ umbral', () => {
    assert.deepEqual(thresholdsToCelebrate(25), [5, 10, 25]);
  });
});
