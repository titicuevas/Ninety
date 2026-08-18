import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickEngagedPreview } from './pickEngagedPreview.ts';

describe('pickEngagedPreview', () => {
  it('prioriza ítems con likes, comentarios o también lo vieron', () => {
    const rows = [
      { id: 'a', likes_count: 0, comments_count: 0 },
      { id: 'b', likes_count: 2, comments_count: 0 },
      { id: 'c', likes_count: 0, comments_count: 1 },
      { id: 'd', likes_count: 0, comments_count: 0 },
      { id: 'e', likes_count: 0, comments_count: 0, also_watched: [{ id: 'p1' }] },
    ];
    assert.deepEqual(
      pickEngagedPreview(rows, 3).map((row) => row.id),
      ['b', 'e', 'c'],
    );
  });

  it('no duplica y respeta el límite', () => {
    assert.deepEqual(pickEngagedPreview([{ id: 'a', likes_count: 1 }], 0), []);
    assert.equal(pickEngagedPreview([{ id: 'a', likes_count: 1 }, { id: 'b' }], 1).length, 1);
  });
});
