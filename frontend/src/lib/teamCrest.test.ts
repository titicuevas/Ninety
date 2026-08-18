import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { teamInitials } from './teamCrest.ts';

describe('teamInitials', () => {
  it('usa las dos primeras letras si hay un solo nombre', () => {
    assert.equal(teamInitials('Villarreal'), 'VI');
    assert.equal(teamInitials('  Betis  '), 'BE');
  });

  it('usa la inicial de las dos primeras palabras', () => {
    assert.equal(teamInitials('Real Betis'), 'RB');
    assert.equal(teamInitials('Manchester City'), 'MC');
  });

  it('hueco vacío queda como ?', () => {
    assert.equal(teamInitials(''), '?');
    assert.equal(teamInitials('   '), '?');
  });
});
