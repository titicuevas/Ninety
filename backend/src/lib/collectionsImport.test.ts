import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COLLECTIONS_IMPORT_MAX,
  formatCollectionsImportSummary,
  parseCollectionsImportPayload,
  toImportCollection,
} from './collectionsImport.js';

const validCollection = {
  name: 'Clásicos',
  slug: 'clasicos',
  description: 'Derbis',
  is_public: true,
  cover_match_id: 42,
  items: [
    { match_id: 42, position: 0 },
    { match_id: 7, position: 1 },
  ],
};

describe('collectionsImport', () => {
  it('toImportCollection normaliza slug e ítems', () => {
    const { row, skipped_invalid_items } = toImportCollection({
      ...validCollection,
      items: [
        { match_id: 42, position: 5 },
        { match_id: 42, position: 1 },
        { match_id: 'x' },
        { match_id: 7, position: 0 },
      ],
    });
    assert.ok(row);
    assert.equal(row.slug, 'clasicos');
    assert.equal(row.cover_match_id, 42);
    assert.deepEqual(row.items, [
      { match_id: 7, position: 0 },
      { match_id: 42, position: 1 },
    ]);
    assert.equal(skipped_invalid_items, 2);
  });

  it('parseCollectionsImportPayload acepta kind collections y dedupea slug', () => {
    const result = parseCollectionsImportPayload({
      exported_at: '2026-08-11T00:00:00.000Z',
      format_version: 1,
      kind: 'collections',
      profile: { username: 'demo', display_name: 'Demo' },
      collections: [validCollection, { ...validCollection, name: 'Otro' }, { name: '' }],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.rows.length, 1);
    assert.equal(result.skipped_duplicate_in_file, 1);
    assert.equal(result.skipped_invalid, 1);
  });

  it('rechaza export del diario', () => {
    const result = parseCollectionsImportPayload({
      format_version: 1,
      capsules: [{ match_id: 1 }],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /diario/i);
  });

  it('rechaza format_version distinto', () => {
    const result = parseCollectionsImportPayload({
      format_version: 2,
      kind: 'collections',
      collections: [validCollection],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /format_version 1/);
  });

  it('rechaza más de COLLECTIONS_IMPORT_MAX', () => {
    const collections = Array.from({ length: COLLECTIONS_IMPORT_MAX + 1 }, (_, i) => ({
      ...validCollection,
      name: `Lista ${i}`,
      slug: `lista-${i}`,
      cover_match_id: null,
      items: [],
    }));
    const result = parseCollectionsImportPayload({
      format_version: 1,
      kind: 'collections',
      collections,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /Demasiadas/);
  });

  it('formatCollectionsImportSummary es un solo mensaje', () => {
    const message = formatCollectionsImportSummary({
      imported: 2,
      skipped_duplicate: 1,
      skipped_invalid: 0,
      skipped_duplicate_in_file: 0,
      skipped_invalid_items: 1,
      skipped_missing_capsule: 3,
      skipped_limit: 0,
      items_linked: 5,
      total_in_file: 3,
    });
    assert.match(message, /Importadas: 2/);
    assert.match(message, /ítems enlazados: 5/);
    assert.match(message, /ítems inválidos: 1/);
    assert.match(message, /sin Capsule en diario: 3/);
  });
});
