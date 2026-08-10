import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DIARY_IMPORT_MAX_CAPSULES,
  formatDiaryImportSummary,
  parseDiaryImportPayload,
  toImportRow,
} from './diaryImport.js';

const validCapsule = {
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  match_id: 42,
  match_played_at: '2024-05-01T20:00:00.000Z',
  home_team_name: 'Betis',
  away_team_name: 'Sevilla',
  home_team_crest: 'https://crests.example/betis.png',
  away_team_crest: null,
  competition_name: 'La Liga',
  home_score: 1,
  away_score: 1,
  watched_at: '2024-05-01',
  rating: 5,
  note: 'Derbi',
  photo_urls: ['https://cdn.example/remote.jpg'],
  is_public: true,
  watch_context: 'stadium',
  created_at: '2024-05-02T10:00:00Z',
  updated_at: '2024-05-02T10:00:00Z',
};

describe('diaryImport', () => {
  it('toImportRow omite fotos e id del export', () => {
    const row = toImportRow(validCapsule);
    assert.ok(row);
    assert.equal(row.match_id, 42);
    assert.deepEqual(row.photo_urls, []);
    assert.equal('id' in row, false);
    assert.equal(row.home_team_name, 'Betis');
    assert.equal(row.watch_context, 'stadium');
  });

  it('toImportRow rechaza watched_at inválido', () => {
    assert.equal(toImportRow({ ...validCapsule, watched_at: '01-05-2024' }), null);
  });

  it('parseDiaryImportPayload acepta format_version 1 y dedupea match_id', () => {
    const result = parseDiaryImportPayload({
      exported_at: '2026-08-10T00:00:00.000Z',
      format_version: 1,
      profile: { username: 'demo', display_name: 'Demo' },
      capsules: [validCapsule, { ...validCapsule, note: 'dup' }, { match_id: 1 }],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.rows.length, 1);
    assert.equal(result.skipped_duplicate_in_file, 1);
    assert.equal(result.skipped_invalid, 1);
    assert.deepEqual(result.rows[0].photo_urls, []);
  });

  it('rechaza format_version distinto', () => {
    const result = parseDiaryImportPayload({
      format_version: 2,
      capsules: [validCapsule],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /format_version 1/);
  });

  it('rechaza más de DIARY_IMPORT_MAX_CAPSULES', () => {
    const capsules = Array.from({ length: DIARY_IMPORT_MAX_CAPSULES + 1 }, (_, i) => ({
      ...validCapsule,
      match_id: i + 1,
    }));
    const result = parseDiaryImportPayload({ format_version: 1, capsules });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /Demasiadas/);
  });

  it('formatDiaryImportSummary es un solo mensaje', () => {
    const text = formatDiaryImportSummary({
      imported: 3,
      skipped_duplicate: 2,
      skipped_invalid: 1,
      skipped_duplicate_in_file: 0,
      total_in_file: 6,
    });
    assert.match(text, /Importadas: 3/);
    assert.match(text, /ya en el diario: 2/);
    assert.match(text, /inválidas omitidas: 1/);
  });
});
