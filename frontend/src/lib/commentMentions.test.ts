import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractMentionUsernames,
  MAX_MENTIONS_PER_COMMENT,
  splitCommentMentions,
} from './commentMentions.ts';

describe('extractMentionUsernames', () => {
  it('extrae únicos y respeta tope', () => {
    assert.deepEqual(extractMentionUsernames('Hola @Ana @luis @Ana'), ['ana', 'luis']);
    const body = Array.from({ length: 7 }, (_, i) => `@user${i}`).join(' ');
    assert.equal(extractMentionUsernames(body).length, MAX_MENTIONS_PER_COMMENT);
  });

  it('ignora emails', () => {
    assert.deepEqual(extractMentionUsernames('mail foo@bar.com'), []);
  });
});

describe('splitCommentMentions', () => {
  it('enlaza menciones y conserva texto', () => {
    assert.deepEqual(splitCommentMentions('Hola @Ana!'), [
      { type: 'text', value: 'Hola ', start: 0 },
      { type: 'mention', username: 'ana', raw: 'Ana', start: 5 },
      { type: 'text', value: '!', start: 9 },
    ]);
  });

  it('no enlaza auto-username', () => {
    assert.deepEqual(splitCommentMentions('x @user_abcd1234 y'), [
      { type: 'text', value: 'x ', start: 0 },
      { type: 'text', value: '@user_abcd1234', start: 2 },
      { type: 'text', value: ' y', start: 16 },
    ]);
  });
});
