import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  dismissDiaryAnniversary,
  isDiaryAnniversaryEnabled,
  localDayKey,
  markDiaryAnniversaryShown,
  readDiaryAnniversaryPrefs,
  setDiaryAnniversaryEnabled,
  shouldShowDiaryAnniversary,
} from './diaryAnniversaryMemory.ts';

const USER = 'user-anni-1';
const NOW = new Date(2026, 7, 2, 12, 0, 0);

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
  hasAnniversary: true,
  now: NOW,
};

describe('diaryAnniversaryMemory', () => {
  it('habilitado por defecto', () => {
    assert.equal(isDiaryAnniversaryEnabled(null), true);
  });

  it('localDayKey formatea YYYY-MM-DD', () => {
    assert.equal(localDayKey(NOW), '2026-08-02');
  });

  it('respeta preferencia desactivada', () => {
    setDiaryAnniversaryEnabled(USER, false);
    assert.equal(isDiaryAnniversaryEnabled(readDiaryAnniversaryPrefs(USER)), false);
    assert.equal(shouldShowDiaryAnniversary(readDiaryAnniversaryPrefs(USER), base), false);
  });

  it('no compite con value onboarding ni core incompleto', () => {
    assert.equal(
      shouldShowDiaryAnniversary(null, { ...base, valueOnboardingVisible: true }),
      false,
    );
    assert.equal(shouldShowDiaryAnniversary(null, { ...base, coreComplete: false }), false);
  });

  it('muestra si hay aniversario y sin dismiss', () => {
    assert.equal(shouldShowDiaryAnniversary(null, base), true);
  });

  it('oculta tras soft dismiss del mismo día', () => {
    dismissDiaryAnniversary(USER, { now: NOW });
    assert.equal(shouldShowDiaryAnniversary(readDiaryAnniversaryPrefs(USER), base), false);
  });

  it('vuelve a mostrar otro día tras soft dismiss', () => {
    dismissDiaryAnniversary(USER, { now: NOW });
    const tomorrow = new Date(2026, 7, 3, 12, 0, 0);
    assert.equal(
      shouldShowDiaryAnniversary(readDiaryAnniversaryPrefs(USER), {
        ...base,
        now: tomorrow,
      }),
      true,
    );
  });

  it('oculta tras dismiss permanente', () => {
    dismissDiaryAnniversary(USER, { permanent: true, now: NOW });
    assert.equal(shouldShowDiaryAnniversary(readDiaryAnniversaryPrefs(USER), base), false);
  });

  it('oculta si ya se mostró hoy', () => {
    markDiaryAnniversaryShown(USER, NOW);
    assert.equal(shouldShowDiaryAnniversary(readDiaryAnniversaryPrefs(USER), base), false);
  });
});
