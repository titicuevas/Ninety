import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  consumeInviteCode,
  invitePath,
  inviteUrl,
  normalizeInviteCode,
  parseRefParam,
  peekInviteCode,
  saveInviteCode,
} from './inviteReferral.ts';
import { DEFAULT_SITE_URL } from './siteUrl.ts';

const memory = new Map<string, string>();

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => {
      memory.clear();
    },
  },
});

describe('inviteReferral', () => {
  beforeEach(() => {
    memory.clear();
  });

  afterEach(() => {
    memory.clear();
  });

  it('normaliza y rechaza códigos inválidos', () => {
    assert.equal(normalizeInviteCode('Henry_Fan'), 'henry_fan');
    assert.equal(normalizeInviteCode('ab'), null);
    assert.equal(normalizeInviteCode('user_deadbeef'), null);
    assert.equal(normalizeInviteCode('Bad-Name'), null);
    assert.equal(normalizeInviteCode('//evil'), null);
  });

  it('arma paths y URLs de invite', () => {
    assert.equal(invitePath('demo_user'), '/invite/demo_user');
    assert.equal(inviteUrl('demo_user'), `${DEFAULT_SITE_URL}/invite/demo_user`);
    assert.equal(invitePath('user_deadbeef'), '/');
  });

  it('parsea ?ref=', () => {
    assert.equal(parseRefParam('?ref=Demo_User'), 'demo_user');
    assert.equal(parseRefParam(new URLSearchParams('ref=abc')), 'abc');
    assert.equal(parseRefParam('?ref=//evil'), null);
    assert.equal(parseRefParam(''), null);
  });

  it('persiste y consume el código en sessionStorage', () => {
    saveInviteCode('Demo_Fan');
    assert.equal(peekInviteCode(), 'demo_fan');
    assert.equal(consumeInviteCode(), 'demo_fan');
    assert.equal(peekInviteCode(), null);
    saveInviteCode('//evil');
    assert.equal(peekInviteCode(), null);
  });
});
