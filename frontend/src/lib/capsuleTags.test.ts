import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CAPSULE_TAGS_MAX,
  listCapsuleTags,
  normalizeCapsuleTag,
  normalizeCapsuleTags,
  parseTagFilter,
} from './capsuleTags.ts';

describe('capsuleTags', () => {
  it('normaliza y dedupea', () => {
    assert.equal(normalizeCapsuleTag('  Viaje  '), 'viaje');
    assert.deepEqual(normalizeCapsuleTags(['Derbi', 'derbi', 'final']), ['derbi', 'final']);
    assert.equal(normalizeCapsuleTags(Array.from({ length: 12 }, (_, i) => `t${i}`)).length, CAPSULE_TAGS_MAX);
  });

  it('lista tags únicos del diario', () => {
    assert.deepEqual(
      listCapsuleTags([
        { tags: ['derbi', 'viaje'] },
        { tags: ['Derbi', 'final'] },
        { tags: null },
      ]),
      ['derbi', 'final', 'viaje'],
    );
  });

  it('parseTagFilter', () => {
    assert.equal(parseTagFilter('Clásico'), 'clásico');
    assert.equal(parseTagFilter(null), undefined);
    assert.equal(parseTagFilter('bad!'), undefined);
  });
});
