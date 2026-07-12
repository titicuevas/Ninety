import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  containsBlockedLanguage,
  detectImageMime,
  normalizeForModeration,
  validateCommentBody,
  validateImageBuffer,
} from './contentModeration.js';

describe('contentModeration', () => {
  it('normaliza acentos y leetspeak', () => {
    assert.equal(normalizeForModeration('G1L1P0LL4S'), 'gilipollas');
  });

  it('bloquea insultos claros', () => {
    assert.equal(containsBlockedLanguage('Eres un gilipollas'), true);
    assert.equal(containsBlockedLanguage('hijo de puta'), true);
    assert.equal(containsBlockedLanguage('P U T O'), true);
  });

  it('permite comentarios futboleros normales', () => {
    assert.equal(containsBlockedLanguage('Qué partidazo del Betis'), false);
    assert.equal(containsBlockedLanguage('El árbitro fue malísimo'), false);
    assert.equal(containsBlockedLanguage('Golazo increíble'), false);
  });

  it('validateCommentBody devuelve mensaje amigable', () => {
    assert.equal(validateCommentBody('Gran partido'), null);
    assert.match(validateCommentBody('vete a la mierda') ?? '', /ofensivo/i);
  });

  it('detecta magic bytes JPEG', () => {
    const jpeg = Buffer.alloc(120, 0);
    jpeg[0] = 0xff;
    jpeg[1] = 0xd8;
    jpeg[2] = 0xff;
    assert.equal(detectImageMime(jpeg), 'image/jpeg');
    assert.equal(validateImageBuffer(jpeg, 'image/jpeg'), null);
  });

  it('rechaza mime que no coincide con contenido', () => {
    const jpeg = Buffer.alloc(120, 0);
    jpeg[0] = 0xff;
    jpeg[1] = 0xd8;
    jpeg[2] = 0xff;
    assert.match(validateImageBuffer(jpeg, 'image/png') ?? '', /no coincide/i);
  });
});
