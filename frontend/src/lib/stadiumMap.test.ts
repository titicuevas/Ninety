import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeStadiumMap,
  pickFavoriteStadium,
  projectStadium,
  resolveStadiumForCapsule,
  stadiumCapsuleHref,
  stadiumDiaryHref,
} from './stadiumMap.ts';
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
    competition_name: null,
    home_score: null,
    away_score: null,
    rating: null,
    note: null,
    photo_urls: [],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...partial,
  };
}

describe('resolveStadiumForCapsule', () => {
  it('prioriza el equipo local del catálogo', () => {
    const stadium = resolveStadiumForCapsule({
      home_team_name: 'Real Betis',
      away_team_name: 'Sevilla FC',
    });
    assert.equal(stadium?.id, 'benito-villamarin');
  });

  it('resuelve por away si el local no está en catálogo', () => {
    const stadium = resolveStadiumForCapsule({
      home_team_name: 'Equipo Desconocido',
      away_team_name: 'Liverpool',
    });
    assert.equal(stadium?.id, 'anfield');
  });

  it('no confunde Atlético de Madrid con el Bernabéu', () => {
    const stadium = resolveStadiumForCapsule({
      home_team_name: 'Atlético de Madrid',
      away_team_name: 'Real Betis',
    });
    assert.equal(stadium?.id, 'metropolitano');
  });
});

describe('projectStadium', () => {
  it('proyecta Sevilla dentro del viewBox', () => {
    const p = projectStadium(37.3565, -5.9816);
    assert.ok(p);
    assert.ok(p.x > 0 && p.x < 100);
    assert.ok(p.y > 0 && p.y < 100);
  });

  it('rechaza coordenadas fuera de Europa occidental', () => {
    assert.equal(projectStadium(40, 100), null);
  });
});

describe('computeStadiumMap', () => {
  it('agrega visitas y cuenta unmatched', () => {
    const result = computeStadiumMap([
      capsule({
        id: '1',
        watched_at: '2025-03-01',
        home_team_name: 'Real Betis',
        away_team_name: 'Valencia',
        watch_context: 'stadium',
        rating: 5,
      }),
      capsule({
        id: '2',
        watched_at: '2025-04-01',
        home_team_name: 'Betis',
        away_team_name: 'Madrid',
        watch_context: 'stadium',
        rating: 4,
      }),
      capsule({
        id: '3',
        watched_at: '2025-05-01',
        home_team_name: 'Club Inventado',
        away_team_name: 'Otro',
        watch_context: 'stadium',
      }),
      capsule({
        id: '4',
        watched_at: '2025-06-01',
        home_team_name: 'Betis',
        away_team_name: 'Celta',
        watch_context: 'tv',
      }),
    ]);

    assert.equal(result.stadiumCapsuleCount, 3);
    assert.equal(result.unmatchedStadiumCount, 1);
    assert.equal(result.visits.length, 1);
    assert.equal(result.visits[0]?.stadium.id, 'benito-villamarin');
    assert.equal(result.visits[0]?.visits, 2);
    assert.equal(result.visits[0]?.averageRating, 4.5);
    assert.equal(result.favorite?.stadium.id, 'benito-villamarin');
    assert.deepEqual(result.countries, ['ES']);
  });

  it('elige favorito por visitas y desempata con media ★', () => {
    const result = computeStadiumMap([
      capsule({
        id: 'a1',
        watched_at: '2025-03-01',
        home_team_name: 'Real Betis',
        away_team_name: 'Valencia',
        watch_context: 'stadium',
        rating: 3,
      }),
      capsule({
        id: 'b1',
        watched_at: '2025-04-01',
        home_team_name: 'Sevilla FC',
        away_team_name: 'Betis',
        watch_context: 'stadium',
        rating: 5,
      }),
      capsule({
        id: 'b2',
        watched_at: '2025-05-01',
        home_team_name: 'Sevilla',
        away_team_name: 'Madrid',
        watch_context: 'stadium',
        rating: 5,
      }),
    ]);
    assert.equal(result.favorite?.stadium.id, 'ramon-sanchez-pizjuan');
    assert.equal(pickFavoriteStadium(result.visits)?.stadium.id, 'ramon-sanchez-pizjuan');
  });

  it('devuelve vacío sin visitas a estadio', () => {
    const result = computeStadiumMap([
      capsule({
        id: '1',
        watched_at: '2025-01-01',
        home_team_name: 'A',
        away_team_name: 'B',
        watch_context: 'tv',
      }),
    ]);
    assert.equal(result.stadiumCapsuleCount, 0);
    assert.equal(result.visits.length, 0);
    assert.equal(result.favorite, null);
  });
});

describe('stadium deep links', () => {
  it('arma href al diario y a Capsule', () => {
    assert.equal(stadiumDiaryHref(), '/capsules?context=stadium');
    assert.equal(stadiumCapsuleHref('abc'), '/c/abc');
    assert.equal(stadiumCapsuleHref(null), null);
  });
});
