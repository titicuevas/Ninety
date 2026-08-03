import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeDiaryMilestone,
  thresholdsToCelebrate,
} from './diaryMilestone.ts';
import type { Capsule } from '../types/capsule.ts';

function capsule(id: string): Capsule {
  return {
    id,
    user_id: 'u1',
    match_id: 1,
    match_played_at: null,
    home_team_name: 'A',
    away_team_name: 'B',
    home_team_crest: null,
    away_team_crest: null,
    competition_name: null,
    home_score: null,
    away_score: null,
    watched_at: '2026-01-01',
    rating: null,
    note: null,
    photo_urls: [],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };
}

function many(n: number): Capsule[] {
  return Array.from({ length: n }, (_, i) => capsule(`c${i}`));
}

describe('computeDiaryMilestone', () => {
  it('null sin capsules o bajo el primer umbral', () => {
    assert.equal(computeDiaryMilestone([]), null);
    assert.equal(computeDiaryMilestone(many(4)), null);
  });

  it('celebra 5 al llegar', () => {
    const m = computeDiaryMilestone(many(5));
    assert.ok(m);
    assert.equal(m.threshold, 5);
    assert.equal(m.totalMatches, 5);
    assert.match(m.title, /5/i);
    assert.equal(m.href, '/capsules');
  });

  it('elige el umbral más alto alcanzado no celebrado', () => {
    const m = computeDiaryMilestone(many(12), []);
    assert.ok(m);
    assert.equal(m.threshold, 10);
  });

  it('respeta celebrados y salta al siguiente', () => {
    assert.equal(computeDiaryMilestone(many(10), [5, 10]), null);
    const m = computeDiaryMilestone(many(25), [5, 10]);
    assert.ok(m);
    assert.equal(m.threshold, 25);
  });

  it('thresholdsToCelebrate incluye todos los ≤ umbral', () => {
    assert.deepEqual(thresholdsToCelebrate(25), [5, 10, 25]);
  });
});
