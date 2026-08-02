import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  dismissValueOnboarding,
  markCompareVisited,
  readValueOnboardingState,
  shouldShowValueOnboarding,
} from './valueOnboardingMemory.ts';

const USER = 'user-value-1';

const memory = new Map<string, string>();

afterEach(() => {
  memory.clear();
});

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
  coreComplete: true,
  hasCollection: false,
  hasCompare: false,
};

describe('valueOnboardingMemory', () => {
  it('no muestra si el onboarding core no está completo', () => {
    assert.equal(
      shouldShowValueOnboarding(null, { ...baseOpts, coreComplete: false }),
      false,
    );
  });

  it('muestra tras completar el core con pasos de valor pendientes', () => {
    assert.equal(shouldShowValueOnboarding(null, baseOpts), true);
  });

  it('oculta cuando colección y compare están hechos', () => {
    assert.equal(
      shouldShowValueOnboarding(null, {
        ...baseOpts,
        hasCollection: true,
        hasCompare: true,
      }),
      false,
    );
  });

  it('sigue visible si solo falta un paso', () => {
    assert.equal(
      shouldShowValueOnboarding(null, { ...baseOpts, hasCollection: true }),
      true,
    );
    assert.equal(
      shouldShowValueOnboarding(null, { ...baseOpts, hasCompare: true }),
      true,
    );
  });

  it('oculta tras dismiss permanente', () => {
    dismissValueOnboarding(USER, { permanent: true });
    assert.equal(
      shouldShowValueOnboarding(readValueOnboardingState(USER), baseOpts),
      false,
    );
  });

  it('oculta tras soft dismiss reciente', () => {
    dismissValueOnboarding(USER);
    assert.equal(
      shouldShowValueOnboarding(readValueOnboardingState(USER), baseOpts),
      false,
    );
  });

  it('marca compareVisitedAt una sola vez', () => {
    const first = markCompareVisited(USER);
    const second = markCompareVisited(USER);
    assert.ok(first?.compareVisitedAt);
    assert.equal(second?.compareVisitedAt, first?.compareVisitedAt);
  });
});
