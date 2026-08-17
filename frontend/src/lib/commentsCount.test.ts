import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatCommentsCountLabel } from './commentsCount.ts';

describe('formatCommentsCountLabel', () => {
  it('pluraliza el contador', () => {
    assert.equal(formatCommentsCountLabel(0), 'Comentar');
    assert.equal(formatCommentsCountLabel(1), '1 comentario');
    assert.equal(formatCommentsCountLabel(12), '12 comentarios');
  });
});
