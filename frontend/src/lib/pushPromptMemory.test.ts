import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  dismissPushPrompt,
  markPushActivated,
  markPushPromptEligible,
  readPushPromptState,
  shouldShowPushPrompt,
} from './pushPromptMemory.ts';

const USER = 'user-test-1';

const memory = new Map<string, string>();

afterEach(() => {
  memory.clear();
});

// jsdom-less stub for node:test
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  },
});

const baseOpts = {
  supported: true,
  pushConfigured: true,
  pushEnabled: false,
  permission: 'default' as const,
};

describe('pushPromptMemory', () => {
  it('no muestra sin elegibilidad', () => {
    assert.equal(shouldShowPushPrompt(null, baseOpts), false);
  });

  it('muestra tras markEligible', () => {
    markPushPromptEligible(USER, 'first_public_capsule');
    const state = readPushPromptState(USER);
    assert.equal(state?.eligibleReason, 'first_public_capsule');
    assert.equal(shouldShowPushPrompt(state, baseOpts), true);
  });

  it('conserva el primer motivo de elegibilidad', () => {
    markPushPromptEligible(USER, 'first_public_capsule');
    markPushPromptEligible(USER, 'first_follow');
    assert.equal(readPushPromptState(USER)?.eligibleReason, 'first_public_capsule');
  });

  it('oculta tras dismiss permanente', () => {
    markPushPromptEligible(USER, 'first_follow');
    dismissPushPrompt(USER, { permanent: true });
    assert.equal(shouldShowPushPrompt(readPushPromptState(USER), baseOpts), false);
  });

  it('oculta tras activar', () => {
    markPushPromptEligible(USER, 'first_follow');
    markPushActivated(USER);
    assert.equal(shouldShowPushPrompt(readPushPromptState(USER), baseOpts), false);
  });

  it('oculta si permiso denegado o push ya activo', () => {
    markPushPromptEligible(USER, 'first_follow');
    const state = readPushPromptState(USER);
    assert.equal(
      shouldShowPushPrompt(state, { ...baseOpts, permission: 'denied' }),
      false,
    );
    assert.equal(shouldShowPushPrompt(state, { ...baseOpts, pushEnabled: true }), false);
  });

  it('exige motivo concreto si requireReason', () => {
    markPushPromptEligible(USER, 'first_follow');
    const state = readPushPromptState(USER);
    assert.equal(
      shouldShowPushPrompt(state, {
        ...baseOpts,
        requireReason: 'first_public_capsule',
      }),
      false,
    );
    assert.equal(
      shouldShowPushPrompt(state, { ...baseOpts, requireReason: 'first_follow' }),
      true,
    );
  });
});
