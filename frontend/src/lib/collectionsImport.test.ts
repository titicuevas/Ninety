import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readCollectionsImportFile } from './collectionsImport.ts';

describe('collectionsImport (client)', () => {
  it('rechaza archivos que no parecen JSON', async () => {
    const file = new File(['not-json'], 'backup.txt', { type: 'text/plain' });
    await assert.rejects(() => readCollectionsImportFile(file), /JSON/);
  });

  it('parsea JSON válido', async () => {
    const payload = { format_version: 1, kind: 'collections', collections: [] };
    const file = new File([JSON.stringify(payload)], 'ninety-colecciones.json', {
      type: 'application/json',
    });
    const parsed = await readCollectionsImportFile(file);
    assert.deepEqual(parsed, payload);
  });
});
