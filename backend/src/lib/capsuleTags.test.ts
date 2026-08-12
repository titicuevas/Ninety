import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CAPSULE_TAGS_MAX,
  CAPSULE_TAG_MAX_LEN,
  normalizeCapsuleTag,
  normalizeCapsuleTags,
  parseCapsuleTagFilter,
} from './capsuleTags.js';

describe('capsuleTags', () => {
  it('normaliza etiqueta: trim, minúsculas, espacios', () => {
    assert.equal(normalizeCapsuleTag('  Clásico  '), 'clásico');
    assert.equal(normalizeCapsuleTag('Derbi Sevillano'), 'derbi sevillano');
    assert.equal(normalizeCapsuleTag(''), null);
    assert.equal(normalizeCapsuleTag('   '), null);
    assert.equal(normalizeCapsuleTag(12), null);
  });

  it('rechaza longitud excesiva o caracteres raros', () => {
    assert.equal(normalizeCapsuleTag('x'.repeat(CAPSULE_TAG_MAX_LEN + 1)), null);
    assert.equal(normalizeCapsuleTag('ok!'), null);
    assert.equal(normalizeCapsuleTag('#derbi'), null);
    assert.equal(normalizeCapsuleTag('viaje'), 'viaje');
  });

  it('normaliza arrays con dedupe y tope', () => {
    assert.deepEqual(normalizeCapsuleTags(null), []);
    assert.deepEqual(normalizeCapsuleTags(['Clásico', 'clásico', 'viaje']), ['clásico', 'viaje']);
    const many = Array.from({ length: CAPSULE_TAGS_MAX + 3 }, (_, i) => `t${i}`);
    assert.equal(normalizeCapsuleTags(many).length, CAPSULE_TAGS_MAX);
  });

  it('parseCapsuleTagFilter valida query', () => {
    assert.equal(parseCapsuleTagFilter('Derbi'), 'derbi');
    assert.equal(parseCapsuleTagFilter(''), undefined);
    assert.equal(parseCapsuleTagFilter('no!'), undefined);
  });
});
