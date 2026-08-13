import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  dismissDiaryDigest,
  isDiaryDigestEnabled,
  markWeeklyDigestShown,
  readDiaryDigestPrefs,
  setDiaryDigestEnabled,
  shouldShowDiaryDigest,
} from './diaryDigestMemory.ts';

const USER = 'user-digest-1';

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

const base = {
  coreComplete: true,
  valueOnboardingVisible: false,
  hasDigest: true,
  kind: 'nudge' as const,
};

describe('diaryDigestMemory', () => {
  it('habilitado por defecto', () => {
    assert.equal(isDiaryDigestEnabled(null), true);
  });

  it('respeta preferencia desactivada', () => {
    setDiaryDigestEnabled(USER, false);
    assert.equal(isDiaryDigestEnabled(readDiaryDigestPrefs(USER)), false);
    assert.equal(
      shouldShowDiaryDigest(readDiaryDigestPrefs(USER), base),
      false,
    );
  });

  it('no compite con value onboarding, aniversario, hito ni core incompleto', () => {
    assert.equal(
      shouldShowDiaryDigest(null, { ...base, valueOnboardingVisible: true }),
      false,
    );
    assert.equal(
      shouldShowDiaryDigest(null, { ...base, anniversaryVisible: true }),
      false,
    );
    assert.equal(
      shouldShowDiaryDigest(null, { ...base, milestoneVisible: true }),
      false,
    );
    assert.equal(
      shouldShowDiaryDigest(null, { ...base, incompleteCapsuleVisible: true }),
      false,
    );
    assert.equal(
      shouldShowDiaryDigest(null, { ...base, wantToGoNudgeVisible: true }),
      false,
    );
    assert.equal(shouldShowDiaryDigest(null, { ...base, coreComplete: false }), false);
  });

  it('muestra nudge si no hay dismiss', () => {
    assert.equal(shouldShowDiaryDigest(null, base), true);
  });

  it('oculta tras soft dismiss reciente', () => {
    dismissDiaryDigest(USER);
    assert.equal(shouldShowDiaryDigest(readDiaryDigestPrefs(USER), base), false);
  });

  it('oculta tras dismiss permanente', () => {
    dismissDiaryDigest(USER, { permanent: true });
    assert.equal(shouldShowDiaryDigest(readDiaryDigestPrefs(USER), base), false);
  });

  it('respeta cooldown del weekly', () => {
    markWeeklyDigestShown(USER, new Date());
    assert.equal(
      shouldShowDiaryDigest(readDiaryDigestPrefs(USER), { ...base, kind: 'weekly' }),
      false,
    );
  });
});
