import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { profilePath, publicProfilePath } from './profilePath.ts';

describe('profilePath', () => {
  it('codifica el username en la ruta', () => {
    assert.equal(profilePath('henry_madridista'), '/u/henry_madridista');
    assert.equal(profilePath('a/b'), '/u/a%2Fb');
  });
});

describe('publicProfilePath', () => {
  it('devuelve null para auto/null/vacío', () => {
    assert.equal(publicProfilePath(null), null);
    assert.equal(publicProfilePath(undefined), null);
    assert.equal(publicProfilePath(''), null);
    assert.equal(publicProfilePath('user_a1b2c3d4'), null);
  });

  it('devuelve ruta para slug real', () => {
    assert.equal(publicProfilePath('henry_madridista'), '/u/henry_madridista');
  });
});
