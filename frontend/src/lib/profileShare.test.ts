import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildProfileShareText } from './profileShare.ts';
import { DEFAULT_SITE_URL } from './siteUrl.ts';

describe('buildProfileShareText', () => {
  it('incluye resumen y enlace del perfil', () => {
    const text = buildProfileShareText({
      username: 'henry_madridista',
      displayName: 'Henry',
      favoriteTeam: 'Real Madrid',
      city: 'Madrid',
      country: 'España',
      publicCapsulesCount: 12,
      collectionsCount: 2,
      achievementsCount: 4,
      followersCount: 8,
    });

    assert.match(text, /Henry en Ninety/);
    assert.match(text, /@henry_madridista/);
    assert.match(text, /Club: Real Madrid/);
    assert.match(text, /Madrid, España/);
    assert.match(text, /12 Capsules públicas/);
    assert.match(text, /2 listas/);
    assert.match(text, /4 logros/);
    assert.match(text, /8 seguidores/);
    assert.match(text, new RegExp(`${DEFAULT_SITE_URL}/u/henry_madridista`));
  });

  it('omite métricas a cero', () => {
    const text = buildProfileShareText({
      username: 'fan',
      displayName: null,
      publicCapsulesCount: 0,
      collectionsCount: 0,
    });
    assert.match(text, /@fan en Ninety|fan en Ninety/);
    assert.doesNotMatch(text, /Capsule/);
    assert.doesNotMatch(text, /lista/);
  });
});
