import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatCollectionCardMeta, formatEngagementMeta } from './collectionCardMeta.ts';

describe('formatCollectionCardMeta', () => {
  it('solo partidos si no hay engagement', () => {
    assert.equal(formatCollectionCardMeta(5), '5 partidos');
    assert.equal(formatCollectionCardMeta(1, 0, 0), '1 partido');
  });

  it('añade me gusta y comentarios cuando hay', () => {
    assert.equal(formatCollectionCardMeta(5, 1, 0), '5 partidos · 1 me gusta');
    assert.equal(
      formatCollectionCardMeta(5, 1, 1),
      '5 partidos · 1 me gusta · 1 comentario',
    );
    assert.equal(
      formatCollectionCardMeta(2, 4, 3),
      '2 partidos · 4 me gusta · 3 comentarios',
    );
  });
});

describe('formatEngagementMeta', () => {
  it('vacío si no hay likes ni comentarios', () => {
    assert.equal(formatEngagementMeta(), '');
    assert.equal(formatEngagementMeta(0, 0), '');
  });

  it('junta me gusta y comentarios', () => {
    assert.equal(formatEngagementMeta(1, 0), '1 me gusta');
    assert.equal(formatEngagementMeta(0, 2), '2 comentarios');
    assert.equal(formatEngagementMeta(3, 1), '3 me gusta · 1 comentario');
  });
});
