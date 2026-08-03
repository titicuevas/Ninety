import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  celebrateDiaryMilestone,
  dismissDiaryMilestone,
  getCelebratedMilestones,
  isDiaryMilestoneEnabled,
  readDiaryMilestonePrefs,
  setDiaryMilestoneEnabled,
  shouldShowDiaryMilestone,
} from './diaryMilestoneMemory.ts';

const USER = 'user-milestone-1';

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
  hasMilestone: true,
};

describe('diaryMilestoneMemory', () => {
  it('habilitado por defecto', () => {
    assert.equal(isDiaryMilestoneEnabled(null), true);
  });

  it('respeta preferencia desactivada', () => {
    setDiaryMilestoneEnabled(USER, false);
    assert.equal(isDiaryMilestoneEnabled(readDiaryMilestonePrefs(USER)), false);
    assert.equal(shouldShowDiaryMilestone(readDiaryMilestonePrefs(USER), base), false);
  });

  it('no compite con value onboarding, aniversario ni core incompleto', () => {
    assert.equal(
      shouldShowDiaryMilestone(null, { ...base, valueOnboardingVisible: true }),
      false,
    );
    assert.equal(
      shouldShowDiaryMilestone(null, { ...base, anniversaryVisible: true }),
      false,
    );
    assert.equal(shouldShowDiaryMilestone(null, { ...base, coreComplete: false }), false);
  });

  it('muestra si hay hito pendiente', () => {
    assert.equal(shouldShowDiaryMilestone(null, base), true);
  });

  it('celebra umbrales y los persiste', () => {
    celebrateDiaryMilestone(USER, [5, 10]);
    assert.deepEqual(getCelebratedMilestones(readDiaryMilestonePrefs(USER)), [5, 10]);
  });

  it('oculta tras soft dismiss reciente', () => {
    dismissDiaryMilestone(USER);
    assert.equal(shouldShowDiaryMilestone(readDiaryMilestonePrefs(USER), base), false);
  });

  it('oculta tras dismiss permanente', () => {
    dismissDiaryMilestone(USER, { permanent: true });
    assert.equal(shouldShowDiaryMilestone(readDiaryMilestonePrefs(USER), base), false);
  });
});
