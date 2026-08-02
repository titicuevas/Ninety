import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nextUniqueSlug, slugifyCollectionName } from './collectionSlug.js';

describe('slugifyCollectionName', () => {
  it('normaliza acentos y espacios', () => {
    assert.equal(slugifyCollectionName('Clásicos del Betis'), 'clasicos-del-betis');
    assert.equal(slugifyCollectionName('  Noches de Champions  '), 'noches-de-champions');
  });

  it('fallback si el nombre no tiene alfanuméricos', () => {
    assert.equal(slugifyCollectionName('!!!'), 'coleccion');
  });
});

describe('nextUniqueSlug', () => {
  it('devuelve el slug base si está libre', () => {
    assert.equal(nextUniqueSlug('Viajes', new Set()), 'viajes');
  });

  it('añade sufijo numérico si está ocupado', () => {
    const taken = new Set(['viajes', 'viajes-2']);
    assert.equal(nextUniqueSlug('Viajes', taken), 'viajes-3');
  });
});
