import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readDiaryImportFile } from './diaryImport';

describe('diaryImport (client)', () => {
  it('readDiaryImportFile parsea JSON válido', async () => {
    const file = new File(
      [JSON.stringify({ format_version: 1, capsules: [] })],
      'ninety-diario.json',
      { type: 'application/json' },
    );
    const parsed = await readDiaryImportFile(file);
    assert.deepEqual(parsed, { format_version: 1, capsules: [] });
  });

  it('readDiaryImportFile rechaza JSON roto', async () => {
    const file = new File(['{no'], 'broken.json', { type: 'application/json' });
    await assert.rejects(() => readDiaryImportFile(file), /JSON válido/);
  });
});
