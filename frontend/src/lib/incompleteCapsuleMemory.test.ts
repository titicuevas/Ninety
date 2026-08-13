import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  dismissIncompleteCapsuleNudge,
  getSkippedIncompleteCapsuleIds,
  readIncompleteCapsulePrefs,
  shouldShowIncompleteCapsuleNudge,
  skipIncompleteCapsule,
} from './incompleteCapsuleMemory.ts';

const USER = 'user-incomplete-1';
const memory = new Map<string, string>();

afterEach(() => memory.clear());

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

const base = {
  coreComplete: true,
  valueOnboardingVisible: false,
  hasCandidate: true,
};

describe('incompleteCapsuleMemory', () => {
  it('muestra si hay candidato y no hay dismiss', () => {
    assert.equal(shouldShowIncompleteCapsuleNudge(null, base), true);
  });

  it('no compite con onboarding, aniversario o hito', () => {
    assert.equal(
      shouldShowIncompleteCapsuleNudge(null, { ...base, valueOnboardingVisible: true }),
      false,
    );
    assert.equal(
      shouldShowIncompleteCapsuleNudge(null, { ...base, anniversaryVisible: true }),
      false,
    );
    assert.equal(
      shouldShowIncompleteCapsuleNudge(null, { ...base, milestoneVisible: true }),
      false,
    );
  });

  it('respeta soft dismiss y permanent', () => {
    dismissIncompleteCapsuleNudge(USER, { capsuleId: 'c1' });
    assert.equal(
      shouldShowIncompleteCapsuleNudge(readIncompleteCapsulePrefs(USER), base),
      false,
    );
    assert.deepEqual(getSkippedIncompleteCapsuleIds(readIncompleteCapsulePrefs(USER)), ['c1']);

    dismissIncompleteCapsuleNudge(USER, { permanent: true });
    assert.equal(
      shouldShowIncompleteCapsuleNudge(readIncompleteCapsulePrefs(USER), base),
      false,
    );
  });

  it('skipIncompleteCapsule acumula ids', () => {
    skipIncompleteCapsule(USER, 'a');
    skipIncompleteCapsule(USER, 'b');
    assert.deepEqual(getSkippedIncompleteCapsuleIds(readIncompleteCapsulePrefs(USER)), [
      'a',
      'b',
    ]);
  });
});
