import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CAPSULE_NOTE_MAX,
  isCapsuleNoteTooLong,
  normalizeCapsuleNote,
} from './capsuleNote.js';

describe('capsuleNote', () => {
  it('normaliza vacío y whitespace a null', () => {
    assert.equal(normalizeCapsuleNote(null), null);
    assert.equal(normalizeCapsuleNote(undefined), null);
    assert.equal(normalizeCapsuleNote(''), null);
    assert.equal(normalizeCapsuleNote('   '), null);
    assert.equal(normalizeCapsuleNote(12), null);
  });

  it('recorta y trunca al máximo', () => {
    assert.equal(normalizeCapsuleNote('  noche épica  '), 'noche épica');
    const long = 'x'.repeat(CAPSULE_NOTE_MAX + 40);
    const normalized = normalizeCapsuleNote(long);
    assert.equal(normalized?.length, CAPSULE_NOTE_MAX);
  });

  it('detecta notas demasiado largas', () => {
    assert.equal(isCapsuleNoteTooLong('ok'), false);
    assert.equal(isCapsuleNoteTooLong('x'.repeat(CAPSULE_NOTE_MAX)), false);
    assert.equal(isCapsuleNoteTooLong('x'.repeat(CAPSULE_NOTE_MAX + 1)), true);
  });
});
