import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildDiaryExportCsv,
  buildDiaryExportJson,
  toExportCapsule,
  type ExportCapsule,
} from './diaryExport.js';

const sample: ExportCapsule = {
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  match_id: 42,
  match_played_at: '2024-05-01T20:00:00Z',
  home_team_name: 'Betis',
  away_team_name: 'Sevilla',
  home_team_crest: null,
  away_team_crest: null,
  competition_name: 'La Liga',
  home_score: 1,
  away_score: 1,
  watched_at: '2024-05-01',
  rating: 5,
  note: 'Derbi, "noche" épica',
  tags: ['derbi', 'clásico'],
  photo_urls: ['https://example.com/a.jpg'],
  is_public: true,
  watch_context: 'stadium',
  created_at: '2024-05-02T10:00:00Z',
  updated_at: '2024-05-02T10:00:00Z',
};

describe('diaryExport', () => {
  it('toExportCapsule omite user_id y campos extra', () => {
    const exported = toExportCapsule({
      ...sample,
      user_id: 'secret-user-id',
      weird: true,
    });
    assert.equal(exported.id, sample.id);
    assert.equal('user_id' in exported, false);
  });

  it('JSON incluye metadatos y capsules', () => {
    const json = buildDiaryExportJson({
      exported_at: '2026-08-02T00:00:00.000Z',
      format_version: 1,
      profile: { username: 'demo', display_name: 'Demo' },
      capsules: [sample],
    });
    const parsed = JSON.parse(json) as { format_version: number; capsules: unknown[] };
    assert.equal(parsed.format_version, 1);
    assert.equal(parsed.capsules.length, 1);
    assert.match(json, /Betis/);
    assert.doesNotMatch(json, /secret-user-id/);
  });

  it('CSV escapa comillas y comas', () => {
    const csv = buildDiaryExportCsv([sample]);
    assert.match(csv, /^id,match_id/);
    assert.match(csv, /"Derbi, ""noche"" épica"/);
  });
});
