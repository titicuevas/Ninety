import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCollectionShareText } from './collectionShare.ts';
import { DEFAULT_SITE_URL } from './siteUrl.ts';

describe('buildCollectionShareText', () => {
  it('incluye resumen y enlace de la lista', () => {
    const text = buildCollectionShareText({
      name: 'Clásicos',
      username: 'henry_madridista',
      slug: 'clasicos',
      description: 'Mis derbis favoritos',
      authorDisplayName: 'Henry',
      itemsCount: 8,
      likesCount: 3,
    });

    assert.match(text, /Clásicos · Ninety/);
    assert.match(text, /Lista de Henry/);
    assert.match(text, /8 partidos/);
    assert.match(text, /3 me gusta/);
    assert.match(text, /Mis derbis favoritos/);
    assert.match(
      text,
      new RegExp(`${DEFAULT_SITE_URL}/u/henry_madridista/lists/clasicos`),
    );
  });

  it('omite métricas a cero y trunca descripción larga', () => {
    const long = 'x'.repeat(140);
    const text = buildCollectionShareText({
      name: 'Viajes',
      username: 'fan',
      slug: 'viajes',
      description: long,
      itemsCount: 0,
      likesCount: 0,
    });
    assert.match(text, /Viajes · Ninety/);
    assert.match(text, /Lista de @fan/);
    assert.doesNotMatch(text, /partido/);
    assert.doesNotMatch(text, /me gusta/);
    assert.match(text, /…/);
    assert.ok(!text.includes(long));
  });
});
