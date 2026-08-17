import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { alsoCommentedLabel } from './capsuleAlsoCommented.ts';

describe('capsuleAlsoCommented', () => {
  it('etiqueta singular / plural', () => {
    assert.equal(alsoCommentedLabel(1), 'También comentó');
    assert.equal(alsoCommentedLabel(2), 'También comentaron');
  });
});
