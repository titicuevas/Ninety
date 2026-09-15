import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAutoUsername,
  isProfileIncomplete,
  nextSuggestedUsername,
  suggestUsername,
} from './profileHelpers.ts';

describe('isAutoUsername', () => {
  it('detecta usernames placeholder user_xxxxxxxx', () => {
    assert.equal(isAutoUsername('user_a1b2c3d4'), true);
    assert.equal(isAutoUsername('user_ABCDEF12'), true);
    assert.equal(isAutoUsername(null), true);
    assert.equal(isAutoUsername(undefined), true);
    assert.equal(isAutoUsername(''), true);
  });

  it('acepta usernames elegidos por el usuario', () => {
    assert.equal(isAutoUsername('henry_madridista'), false);
    assert.equal(isAutoUsername('aficionado_demo'), false);
    assert.equal(isAutoUsername('user_xyz'), false);
  });
});

describe('suggestUsername', () => {
  it('slugifica el nombre a username válido', () => {
    assert.equal(suggestUsername('Henry Madridista'), 'henry_madridista');
    assert.equal(suggestUsername('  José  María  '), 'jose_maria');
    assert.equal(suggestUsername('FC!!Barça'), 'fc_barca');
  });

  it('devuelve vacío si no hay base usable', () => {
    assert.equal(suggestUsername(''), '');
    assert.equal(suggestUsername('   '), '');
    assert.equal(suggestUsername(null), '');
    assert.equal(suggestUsername('ab'), '');
    assert.equal(suggestUsername('!!!'), '');
  });
});

describe('nextSuggestedUsername', () => {
  it('parte del slug y luego incrementa sufijo', () => {
    assert.equal(nextSuggestedUsername('Enrique Cuevas', ''), 'enrique_cuevas');
    assert.equal(nextSuggestedUsername('Enrique Cuevas', 'enrique_cuevas'), 'enrique_cuevas_2');
    assert.equal(nextSuggestedUsername('Enrique Cuevas', 'enrique_cuevas_2'), 'enrique_cuevas_3');
  });

  it('vuelve al slug si el actual no viene de la sugerencia', () => {
    assert.equal(nextSuggestedUsername('Enrique Cuevas', 'otro_nick'), 'enrique_cuevas');
  });
});

describe('isProfileIncomplete', () => {
  it('marca incompleto sin perfil, sin nombre o con username auto', () => {
    assert.equal(isProfileIncomplete(undefined), true);
    assert.equal(isProfileIncomplete({ display_name: null, username: 'henry' }), true);
    assert.equal(isProfileIncomplete({ display_name: 'H', username: 'henry' }), true);
    assert.equal(
      isProfileIncomplete({ display_name: 'Henry', username: 'user_deadbeef' }),
      true,
    );
  });

  it('marca completo con nombre y username real', () => {
    assert.equal(
      isProfileIncomplete({ display_name: 'Henry', username: 'henry_madridista' }),
      false,
    );
  });
});
