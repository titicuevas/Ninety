import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUsernameParam } from './usernameParam.js';

describe('normalizeUsernameParam', () => {
  it('hace trim y toLowerCase', () => {
    assert.equal(normalizeUsernameParam('  Henry_Madridista  '), 'henry_madridista');
    assert.equal(normalizeUsernameParam('AFICIONADO_DEMO'), 'aficionado_demo');
  });

  it('decodifica URI y acepta arrays de Express', () => {
    assert.equal(normalizeUsernameParam('user%5Fdemo'), 'user_demo');
    assert.equal(normalizeUsernameParam(['Jose_Maria']), 'jose_maria');
  });

  it('devuelve vacío si falta el param o solo hay espacios', () => {
    assert.equal(normalizeUsernameParam(undefined), '');
    assert.equal(normalizeUsernameParam(''), '');
    assert.equal(normalizeUsernameParam('   '), '');
  });

  it('soporta encoding malformado sin lanzar', () => {
    assert.equal(normalizeUsernameParam('%E0%A4%A'), '%e0%a4%a');
  });
});
