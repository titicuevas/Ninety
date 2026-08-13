import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractMentionUsernames,
  MAX_MENTIONS_PER_COMMENT,
  mentionNotifySkipIds,
} from './commentMentions.js';

describe('extractMentionUsernames', () => {
  it('extrae @usuario únicos en orden', () => {
    assert.deepEqual(extractMentionUsernames('Hola @Ana y @luis'), ['ana', 'luis']);
    assert.deepEqual(extractMentionUsernames('@ana mira esto @ana'), ['ana']);
  });

  it('ignora emails y auto-usernames', () => {
    assert.deepEqual(extractMentionUsernames('escribe a foo@bar.com'), []);
    assert.deepEqual(extractMentionUsernames('hola @user_abcd1234'), []);
  });

  it('respeta el tope de menciones', () => {
    const body = Array.from({ length: 8 }, (_, i) => `@user${i}`).join(' ');
    const got = extractMentionUsernames(body);
    assert.equal(got.length, MAX_MENTIONS_PER_COMMENT);
    assert.deepEqual(got, ['user0', 'user1', 'user2', 'user3', 'user4']);
  });

  it('acepta mención al inicio y con puntuación', () => {
    assert.deepEqual(extractMentionUsernames('@pepe, qué gol'), ['pepe']);
    assert.deepEqual(extractMentionUsernames('(@maria)'), ['maria']);
  });
});

describe('mentionNotifySkipIds', () => {
  it('incluye actor, dueño y extras (padre de reply)', () => {
    const skip = mentionNotifySkipIds({
      actorId: 'actor',
      ownerId: 'owner',
      extraSkipIds: ['parent'],
    });
    assert.equal(skip.has('actor'), true);
    assert.equal(skip.has('owner'), true);
    assert.equal(skip.has('parent'), true);
    assert.equal(skip.has('other'), false);
  });
});
