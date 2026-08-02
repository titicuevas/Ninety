import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAutoUsername, isProfileIncomplete, suggestUsername } from './profileHelpers.ts';

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
