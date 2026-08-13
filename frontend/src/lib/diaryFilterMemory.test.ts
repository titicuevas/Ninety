import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  clearDiaryFilterMemory,
  diaryFilterSnapshotFromSearchParams,
  diaryFilterSnapshotHasValues,
  diaryFilterSnapshotToSearchParams,
  hasAnyDiaryFilterParam,
  readDiaryFilterMemory,
  writeDiaryFilterMemory,
} from './diaryFilterMemory.ts';

const USER = 'user-filters-1';

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

describe('diaryFilterMemory', () => {
  it('detecta params de filtro en la URL', () => {
    assert.equal(hasAnyDiaryFilterParam(new URLSearchParams()), false);
    assert.equal(hasAnyDiaryFilterParam(new URLSearchParams('rating=4')), true);
    assert.equal(hasAnyDiaryFilterParam(new URLSearchParams('foo=1')), false);
  });

  it('persiste y lee un snapshot válido', () => {
    const saved = writeDiaryFilterMemory(USER, {
      rating: 4,
      tag: 'derbi',
      visibility: 'public',
    });
    assert.deepEqual(saved, { rating: 4, tag: 'derbi', visibility: 'public' });
    assert.deepEqual(readDiaryFilterMemory(USER), saved);
  });

  it('normaliza q corta y valores inválidos', () => {
    assert.equal(
      writeDiaryFilterMemory(USER, { q: 'a', rating: 2 as never }),
      null,
    );
    assert.equal(readDiaryFilterMemory(USER), null);
  });

  it('clear elimina la memoria', () => {
    writeDiaryFilterMemory(USER, { year: 2024 });
    clearDiaryFilterMemory(USER);
    assert.equal(readDiaryFilterMemory(USER), null);
  });

  it('roundtrip URL ↔ snapshot', () => {
    const params = new URLSearchParams('q=betis&rating=5&context=stadium&tag=viaje&visibility=private');
    const snap = diaryFilterSnapshotFromSearchParams(params, true);
    assert.equal(diaryFilterSnapshotHasValues(snap), true);
    const back = diaryFilterSnapshotToSearchParams(snap, true);
    assert.equal(back.get('q'), 'betis');
    assert.equal(back.get('rating'), '5');
    assert.equal(back.get('context'), 'stadium');
    assert.equal(back.get('tag'), 'viaje');
    assert.equal(back.get('visibility'), 'private');
  });

  it('ignora JSON corrupto', () => {
    memory.set(`ninety.diaryFilters:v1:${USER}`, '{no-json');
    assert.equal(readDiaryFilterMemory(USER), null);
  });
});
