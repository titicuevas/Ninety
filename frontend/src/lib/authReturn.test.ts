import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  consumeAuthReturnPath,
  DEFAULT_POST_AUTH_PATH,
  locationReturnPath,
  loginPath,
  parseNextParam,
  peekAuthReturnPath,
  registerPath,
  resolveReturnPath,
  safeReturnPath,
  saveAuthReturnPath,
} from './authReturn.ts';

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

describe('resolveReturnPath / safeReturnPath', () => {
  it('acepta paths internos con query y hash', () => {
    assert.equal(resolveReturnPath('/c/abc'), '/c/abc');
    assert.equal(resolveReturnPath('/u/henry?tab=capsules'), '/u/henry?tab=capsules');
    assert.equal(resolveReturnPath('/c/abc#comments'), '/c/abc#comments');
    assert.equal(resolveReturnPath('/feed?scope=explore&sort=popular'), '/feed?scope=explore&sort=popular');
  });

  it('rechaza open redirects y basura', () => {
    assert.equal(resolveReturnPath(null), null);
    assert.equal(resolveReturnPath(''), null);
    assert.equal(resolveReturnPath('   '), null);
    assert.equal(resolveReturnPath('//evil.com'), null);
    assert.equal(resolveReturnPath('/\\evil.com'), null);
    assert.equal(resolveReturnPath('https://evil.com'), null);
    assert.equal(resolveReturnPath('http://evil.com/path'), null);
    assert.equal(resolveReturnPath('evil.com'), null);
  });

  it('rechaza rutas de auth', () => {
    assert.equal(resolveReturnPath('/login'), null);
    assert.equal(resolveReturnPath('/register'), null);
    assert.equal(resolveReturnPath('/forgot-password'), null);
    assert.equal(resolveReturnPath('/auth/callback'), null);
    assert.equal(resolveReturnPath('/auth/reset-password'), null);
    assert.equal(resolveReturnPath('/auth/anything'), null);
  });

  it('safeReturnPath cae al fallback', () => {
    assert.equal(safeReturnPath(null), DEFAULT_POST_AUTH_PATH);
    assert.equal(safeReturnPath('//x'), DEFAULT_POST_AUTH_PATH);
    assert.equal(safeReturnPath('/c/1', '/feed'), '/c/1');
    assert.equal(safeReturnPath('bad', '/feed'), '/feed');
  });
});

describe('parseNextParam / loginPath / registerPath', () => {
  it('parsea next desde search', () => {
    assert.equal(parseNextParam('?next=%2Fc%2Fabc'), '/c/abc');
    assert.equal(parseNextParam(new URLSearchParams('next=/u/henry')), '/u/henry');
    assert.equal(parseNextParam('?next=https%3A%2F%2Fevil.com'), null);
    assert.equal(parseNextParam(''), null);
  });

  it('serializa login/register con next', () => {
    assert.equal(loginPath(), '/login');
    assert.equal(loginPath(null), '/login');
    assert.equal(loginPath('//evil'), '/login');
    assert.equal(loginPath('/c/abc#comments'), '/login?next=%2Fc%2Fabc%23comments');
    assert.equal(registerPath('/u/henry'), '/register?next=%2Fu%2Fhenry');
  });
});

describe('locationReturnPath', () => {
  it('compone pathname + search + hash', () => {
    assert.equal(
      locationReturnPath({ pathname: '/c/1', search: '?x=1', hash: '#comments' }),
      '/c/1?x=1#comments',
    );
    assert.equal(locationReturnPath({ pathname: '/home' }), '/home');
  });
});

describe('sessionStorage auth return', () => {
  beforeEach(() => {
    memory.clear();
  });

  afterEach(() => {
    memory.clear();
  });

  it('guarda, peek y consume', () => {
    saveAuthReturnPath('/c/xyz');
    assert.equal(peekAuthReturnPath(), '/c/xyz');
    assert.equal(consumeAuthReturnPath(), '/c/xyz');
    assert.equal(peekAuthReturnPath(), null);
    assert.equal(consumeAuthReturnPath(), DEFAULT_POST_AUTH_PATH);
  });

  it('ignora destinos inválidos al guardar', () => {
    saveAuthReturnPath('//evil');
    assert.equal(peekAuthReturnPath(), null);
  });
});
