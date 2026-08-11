import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  dismissDiaryPostImport,
  markDiaryImported,
  postImportCollectionsHint,
  readDiaryPostImportState,
  shouldShowDiaryPostImportGuide,
} from './diaryPostImportMemory.ts';

const USER = 'user-post-import-1';

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

const baseOpts = { coreComplete: true };

describe('diaryPostImportMemory', () => {
  it('no muestra sin import previo o sin Capsules nuevas', () => {
    assert.equal(shouldShowDiaryPostImportGuide(null, baseOpts), false);
    markDiaryImported(USER, { importedCount: 0 });
    assert.equal(
      shouldShowDiaryPostImportGuide(readDiaryPostImportState(USER), baseOpts),
      false,
    );
  });

  it('no muestra si el onboarding core no está completo', () => {
    markDiaryImported(USER, { importedCount: 3 });
    assert.equal(
      shouldShowDiaryPostImportGuide(readDiaryPostImportState(USER), {
        coreComplete: false,
      }),
      false,
    );
  });

  it('muestra tras un import con Capsules nuevas', () => {
    markDiaryImported(USER, { importedCount: 5 });
    const state = readDiaryPostImportState(USER);
    assert.equal(state?.importedCount, 5);
    assert.ok(state?.importedAt);
    assert.equal(shouldShowDiaryPostImportGuide(state, baseOpts), true);
  });

  it('oculta tras soft dismiss reciente', () => {
    markDiaryImported(USER, { importedCount: 2 });
    dismissDiaryPostImport(USER);
    assert.equal(
      shouldShowDiaryPostImportGuide(readDiaryPostImportState(USER), baseOpts),
      false,
    );
  });

  it('oculta tras dismiss permanente (aunque haya nuevo import)', () => {
    markDiaryImported(USER, { importedCount: 2 });
    dismissDiaryPostImport(USER, { permanent: true });
    markDiaryImported(USER, { importedCount: 4 });
    assert.equal(
      shouldShowDiaryPostImportGuide(readDiaryPostImportState(USER), baseOpts),
      false,
    );
    assert.equal(readDiaryPostImportState(USER)?.importedCount, 4);
  });

  it('hint de empty state refleja el conteo', () => {
    assert.equal(postImportCollectionsHint(null), null);
    markDiaryImported(USER, { importedCount: 1 });
    assert.match(postImportCollectionsHint(readDiaryPostImportState(USER)) ?? '', /1 Capsule/);
    markDiaryImported(USER, { importedCount: 7 });
    assert.match(postImportCollectionsHint(readDiaryPostImportState(USER)) ?? '', /7 Capsules/);
  });
});
