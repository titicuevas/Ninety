import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CAPSULE_NOTE_MAX,
  capsuleNoteLength,
  normalizeCapsuleNote,
} from './capsuleNote.js';

describe('capsuleNote', () => {
  it('normaliza vacío a null y trunca', () => {
    assert.equal(normalizeCapsuleNote(''), null);
    assert.equal(normalizeCapsuleNote('  hola  '), 'hola');
    assert.equal(normalizeCapsuleNote('y'.repeat(CAPSULE_NOTE_MAX + 5))?.length, CAPSULE_NOTE_MAX);
  });

  it('cuenta longitud para el contador del formulario', () => {
    assert.equal(capsuleNoteLength(undefined), 0);
    assert.equal(capsuleNoteLength('abc'), 3);
  });
});
