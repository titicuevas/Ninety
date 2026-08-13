import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mergeFollowActivityCandidates,
  paginateFollowActivity,
  type FollowActivityCandidate,
} from './followActivity.js';

const capsule = (
  id: string,
  occurred_at: string,
  user_id = 'u1',
): FollowActivityCandidate => ({
  kind: 'capsule',
  id,
  user_id,
  occurred_at,
  home_team_name: 'Betis',
  away_team_name: 'Sevilla',
  competition_name: 'LaLiga',
  rating: 8,
  photo_urls: null,
  watched_at: occurred_at,
});

const collection = (
  id: string,
  occurred_at: string,
  user_id = 'u2',
): FollowActivityCandidate => ({
  kind: 'collection',
  id,
  user_id,
  occurred_at,
  name: 'Clásicos',
  slug: 'clasicos',
  description: null,
});

describe('mergeFollowActivityCandidates', () => {
  it('ordena por occurred_at descendente', () => {
    const merged = mergeFollowActivityCandidates([
      capsule('c1', '2025-01-01T10:00:00Z'),
      collection('l1', '2025-02-01T10:00:00Z'),
      capsule('c2', '2025-01-15T10:00:00Z'),
    ]);

    assert.deepEqual(
      merged.map((row) => row.id),
      ['l1', 'c2', 'c1'],
    );
  });

  it('ante empate de tiempo prioriza capsule sobre collection', () => {
    const ts = '2025-03-01T12:00:00Z';
    const merged = mergeFollowActivityCandidates([
      collection('l1', ts),
      capsule('c1', ts),
    ]);

    assert.equal(merged[0]?.kind, 'capsule');
    assert.equal(merged[1]?.kind, 'collection');
  });
});

describe('paginateFollowActivity', () => {
  it('aplica offset y limit', () => {
    const items = [1, 2, 3, 4, 5];
    assert.deepEqual(paginateFollowActivity(items, 1, 2), [2, 3]);
    assert.deepEqual(paginateFollowActivity(items, 4, 10), [5]);
    assert.deepEqual(paginateFollowActivity(items, 10, 2), []);
  });

  it('normaliza offset/limit negativos', () => {
    assert.deepEqual(paginateFollowActivity([1, 2, 3], -2, 2), [1, 2]);
    assert.deepEqual(paginateFollowActivity([1, 2, 3], 0, -1), []);
  });
});
