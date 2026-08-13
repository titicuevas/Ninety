import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCommentThreads, type CapsuleComment } from '../types/comment';

function c(
  id: string,
  parent_id: string | null,
  created_at = `2025-01-01T00:00:0${id.slice(-1)}Z`,
): CapsuleComment {
  return {
    id,
    capsule_id: 'cap',
    user_id: `u-${id}`,
    body: id,
    created_at,
    parent_id,
    author: null,
  };
}

describe('buildCommentThreads', () => {
  it('agrupa respuestas bajo su raíz', () => {
    const threads = buildCommentThreads([
      c('r1', null, '2025-01-01T00:00:01Z'),
      c('a1', 'r1', '2025-01-01T00:00:02Z'),
      c('r2', null, '2025-01-01T00:00:03Z'),
      c('a2', 'r1', '2025-01-01T00:00:04Z'),
    ]);
    assert.equal(threads.length, 2);
    assert.equal(threads[0]!.root.id, 'r1');
    assert.deepEqual(
      threads[0]!.replies.map((r) => r.id),
      ['a1', 'a2'],
    );
    assert.equal(threads[1]!.root.id, 'r2');
    assert.equal(threads[1]!.replies.length, 0);
  });

  it('promueve huérfanas a raíz', () => {
    const threads = buildCommentThreads([c('orphan', 'missing')]);
    assert.equal(threads.length, 1);
    assert.equal(threads[0]!.root.id, 'orphan');
    assert.equal(threads[0]!.root.parent_id, null);
  });
});
