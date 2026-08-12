import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  INVITE_CLAIM_MAX_AGE_MS,
  isInviteClaimTooOld,
  isMissingInvitesTable,
  isUuid,
  normalizeInviteCode,
} from './invites.js';

describe('invites helpers', () => {
  it('normaliza códigos de username válidos', () => {
    assert.equal(normalizeInviteCode('Henry_Fan'), 'henry_fan');
    assert.equal(normalizeInviteCode('  demo_user  '), 'demo_user');
    assert.equal(normalizeInviteCode('abc'), 'abc');
  });

  it('rechaza códigos inválidos o auto-username', () => {
    assert.equal(normalizeInviteCode(null), null);
    assert.equal(normalizeInviteCode(''), null);
    assert.equal(normalizeInviteCode('ab'), null);
    assert.equal(normalizeInviteCode('Bad-Name'), null);
    assert.equal(normalizeInviteCode('user_deadbeef'), null);
    assert.equal(normalizeInviteCode('//evil'), null);
    assert.equal(normalizeInviteCode('https://evil.com'), null);
  });

  it('valida UUID', () => {
    assert.equal(isUuid('00000000-0000-4000-8000-000000000001'), true);
    assert.equal(isUuid('not-a-uuid'), false);
  });

  it('detecta ventana de claim caducada', () => {
    const now = Date.parse('2026-08-12T12:00:00.000Z');
    assert.equal(isInviteClaimTooOld(null, now), true);
    assert.equal(isInviteClaimTooOld('bad', now), true);
    assert.equal(isInviteClaimTooOld(new Date(now - 1000).toISOString(), now), false);
    assert.equal(
      isInviteClaimTooOld(new Date(now - INVITE_CLAIM_MAX_AGE_MS - 1).toISOString(), now),
      true,
    );
  });

  it('detecta tabla ausente', () => {
    assert.equal(isMissingInvitesTable({ code: '42P01', message: 'relation does not exist' }), true);
    assert.equal(
      isMissingInvitesTable({ message: 'Could not find the table public.invite_attributions' }),
      true,
    );
    assert.equal(isMissingInvitesTable({ code: '23505', message: 'duplicate key' }), false);
  });
});
