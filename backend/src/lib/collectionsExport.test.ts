import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCollectionsExportJson, toExportCollection } from './collectionsExport.js';

describe('collectionsExport', () => {
  it('toExportCollection ordena ítems y limpia cover ajeno', () => {
    const exported = toExportCollection({
      name: 'Clásicos',
      slug: 'clasicos',
      description: 'Derbis',
      is_public: true,
      cover_match_id: 99,
      items: [
        { match_id: 42, position: 2 },
        { match_id: 7, position: 0 },
        { match_id: 0, position: 1 },
      ],
    });
    assert.deepEqual(exported.items, [
      { match_id: 7, position: 0 },
      { match_id: 42, position: 1 },
    ]);
    assert.equal(exported.cover_match_id, null);
  });

  it('conserva cover_match_id si está en ítems', () => {
    const exported = toExportCollection({
      name: 'Viajes',
      slug: 'viajes',
      description: null,
      is_public: false,
      cover_match_id: 42,
      items: [{ match_id: 42, position: 0 }],
    });
    assert.equal(exported.cover_match_id, 42);
    assert.equal(exported.is_public, false);
  });

  it('JSON incluye kind collections y metadatos', () => {
    const json = buildCollectionsExportJson({
      exported_at: '2026-08-11T00:00:00.000Z',
      format_version: 1,
      kind: 'collections',
      profile: { username: 'demo', display_name: 'Demo' },
      collections: [
        toExportCollection({
          name: 'Clásicos',
          slug: 'clasicos',
          description: null,
          is_public: true,
          cover_match_id: null,
          items: [{ match_id: 1, position: 0 }],
        }),
      ],
    });
    const parsed = JSON.parse(json) as {
      kind: string;
      format_version: number;
      collections: unknown[];
    };
    assert.equal(parsed.kind, 'collections');
    assert.equal(parsed.format_version, 1);
    assert.equal(parsed.collections.length, 1);
    assert.doesNotMatch(json, /user_id/);
  });
});
