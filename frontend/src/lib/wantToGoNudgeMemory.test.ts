import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  dismissWantToGoNudge,
  getSkippedWantToGoMatchIds,
  readWantToGoNudgePrefs,
  setWantToGoNudgeEnabled,
  shouldShowWantToGoNudge,
  skipWantToGoNudgeMatch,
} from './wantToGoNudgeMemory.ts';

const USER = 'user-wantogo-nudge-1';
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

describe('wantToGoNudgeMemory', () => {
  it('muestra si hay candidato y no hay dismiss', () => {
    assert.equal(shouldShowWantToGoNudge(null, base), true);
  });

  it('no compite con onboarding, aniversario, hito ni incomplete Capsule', () => {
    assert.equal(
      shouldShowWantToGoNudge(null, { ...base, valueOnboardingVisible: true }),
      false,
    );
    assert.equal(
      shouldShowWantToGoNudge(null, { ...base, anniversaryVisible: true }),
      false,
    );
    assert.equal(
      shouldShowWantToGoNudge(null, { ...base, milestoneVisible: true }),
      false,
    );
    assert.equal(
      shouldShowWantToGoNudge(null, { ...base, incompleteCapsuleVisible: true }),
      false,
    );
  });

  it('respeta soft dismiss y permanent', () => {
    dismissWantToGoNudge(USER, { matchId: 42 });
    assert.equal(shouldShowWantToGoNudge(readWantToGoNudgePrefs(USER), base), false);
    assert.deepEqual(getSkippedWantToGoMatchIds(readWantToGoNudgePrefs(USER)), [42]);

    dismissWantToGoNudge(USER, { permanent: true });
    assert.equal(shouldShowWantToGoNudge(readWantToGoNudgePrefs(USER), base), false);
  });

  it('skipWantToGoNudgeMatch acumula ids', () => {
    skipWantToGoNudgeMatch(USER, 1);
    skipWantToGoNudgeMatch(USER, 2);
    assert.deepEqual(getSkippedWantToGoMatchIds(readWantToGoNudgePrefs(USER)), [1, 2]);
  });

  it('setWantToGoNudgeEnabled desactiva', () => {
    setWantToGoNudgeEnabled(USER, false);
    assert.equal(shouldShowWantToGoNudge(readWantToGoNudgePrefs(USER), base), false);
  });
});
