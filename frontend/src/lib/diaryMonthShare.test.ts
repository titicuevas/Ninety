import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDiaryMonthShareText } from './diaryMonthShare.ts';
import type { Capsule } from '../types/capsule.ts';

function capsule(
  partial: Partial<Capsule> & Pick<Capsule, 'id' | 'watched_at' | 'home_team_name' | 'away_team_name'>,
): Capsule {
  return {
    user_id: 'u1',
    match_id: 1,
    match_played_at: null,
    home_team_crest: null,
    away_team_crest: null,
    competition_name: 'La Liga',
    home_score: 1,
    away_score: 0,
    rating: 5,
    note: null,
    photo_urls: [],
    is_public: true,
    created_at: '2025-03-01T00:00:00Z',
    updated_at: '2025-03-01T00:00:00Z',
    ...partial,
  };
}

describe('buildDiaryMonthShareText', () => {
  it('incluye resumen y enlace del mes', () => {
    const text = buildDiaryMonthShareText({
      name: 'María',
      year: 2025,
      month: 3,
      monthUrl: 'https://getninety.app/u/maria/calendar/2025/3',
      capsules: [
        capsule({
          id: '1',
          watched_at: '2025-03-10',
          home_team_name: 'Real Betis',
          away_team_name: 'Sevilla',
          watch_context: 'stadium',
          rating: 5,
        }),
        capsule({
          id: '2',
          watched_at: '2025-03-20',
          home_team_name: 'Real Betis',
          away_team_name: 'Valencia',
          rating: 4,
          is_public: false,
        }),
      ],
    });

    assert.match(text, /Marzo de 2025/);
    assert.match(text, /María/);
    assert.match(text, /1 partido/);
    assert.match(text, /Equipo top: Real Betis/);
    assert.match(text, /En el estadio: 1 partido/);
    assert.match(text, /https:\/\/getninety\.app\/u\/maria\/calendar\/2025\/3/);
    assert.doesNotMatch(text, /Valencia/);
  });

  it('maneja mes sin públicas', () => {
    const text = buildDiaryMonthShareText({
      name: '@demo',
      year: 2025,
      month: 1,
      monthUrl: 'https://example.com/m',
      capsules: [
        capsule({
          id: '1',
          watched_at: '2025-01-01',
          home_team_name: 'A',
          away_team_name: 'B',
          is_public: false,
        }),
      ],
    });
    assert.match(text, /Sin partidos públicos este mes/);
  });
});
