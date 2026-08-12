import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  favoriteTeamIlikePattern,
  rankDiscoverProfiles,
  tallyPublicCapsuleActivity,
  teamsMatch,
} from './discoverProfiles.js';

const base = {
  avatar_url: null,
  favorite_team: null as string | null,
  country: null as string | null,
  city: null as string | null,
  created_at: '2025-01-01T00:00:00Z',
  full_name: null,
};

describe('teamsMatch', () => {
  it('empareja Betis con Real Betis', () => {
    assert.equal(teamsMatch('Betis', 'Real Betis'), true);
    assert.equal(teamsMatch('Real Betis', 'Betis'), true);
  });

  it('empareja FC Barcelona con Barcelona', () => {
    assert.equal(teamsMatch('FC Barcelona', 'Barcelona'), true);
  });

  it('no empareja equipos distintos', () => {
    assert.equal(teamsMatch('Betis', 'Sevilla'), false);
    assert.equal(teamsMatch('Real Madrid', 'Real Betis'), false);
  });

  it('ignora acentos', () => {
    assert.equal(teamsMatch('Atlético', 'Atletico'), true);
  });
});

describe('favoriteTeamIlikePattern', () => {
  it('envuelve el equipo y limpia comodines', () => {
    assert.equal(favoriteTeamIlikePattern('  Betis  '), '%Betis%');
    assert.equal(favoriteTeamIlikePattern('100%_Betis'), '%100Betis%');
    assert.equal(favoriteTeamIlikePattern('a'), null);
  });
});

describe('tallyPublicCapsuleActivity', () => {
  it('cuenta por autor y respeta exclusiones', () => {
    const counts = tallyPublicCapsuleActivity(
      [
        { user_id: 'a' },
        { user_id: 'a' },
        { user_id: 'b' },
        { user_id: 'viewer' },
        { user_id: 'blocked' },
      ],
      'viewer',
      new Set(['blocked']),
    );
    assert.equal(counts.get('a'), 2);
    assert.equal(counts.get('b'), 1);
    assert.equal(counts.has('viewer'), false);
    assert.equal(counts.has('blocked'), false);
  });
});

describe('rankDiscoverProfiles', () => {
  it('prioriza mismo equipo favorito sobre más recientes', () => {
    const ranked = rankDiscoverProfiles(
      [
        { ...base, id: '1', username: 'nuevo', favorite_team: 'Madrid', created_at: '2025-06-01T00:00:00Z' },
        { ...base, id: '2', username: 'betis_fan', favorite_team: 'Betis', created_at: '2024-01-01T00:00:00Z' },
        { ...base, id: '3', username: 'otro', favorite_team: 'Sevilla', created_at: '2025-05-01T00:00:00Z' },
      ],
      { favorite_team: 'Betis' },
      new Set(),
      3,
    );

    assert.equal(ranked[0]?.username, 'betis_fan');
    assert.equal(ranked[0]?.match_reason, 'favorite_team');
  });

  it('prioriza Real Betis cuando el viewer tiene Betis', () => {
    const ranked = rankDiscoverProfiles(
      [
        { ...base, id: '1', username: 'nuevo', favorite_team: 'Sevilla', created_at: '2025-06-01T00:00:00Z' },
        {
          ...base,
          id: '2',
          username: 'verdiblanco',
          favorite_team: 'Real Betis',
          created_at: '2023-01-01T00:00:00Z',
        },
      ],
      { favorite_team: 'Betis' },
      new Set(),
      2,
    );

    assert.equal(ranked[0]?.username, 'verdiblanco');
    assert.equal(ranked[0]?.match_reason, 'favorite_team');
  });

  it('excluye usuarios ya seguidos', () => {
    const ranked = rankDiscoverProfiles(
      [
        { ...base, id: '1', username: 'a', favorite_team: 'Betis' },
        { ...base, id: '2', username: 'b', favorite_team: 'Betis' },
      ],
      { favorite_team: 'Betis' },
      new Set(['1']),
      6,
    );

    assert.equal(ranked.length, 1);
    assert.equal(ranked[0]?.username, 'b');
  });

  it('marca ciudad cuando no hay match de equipo', () => {
    const ranked = rankDiscoverProfiles(
      [
        { ...base, id: '1', username: 'local', city: 'Sevilla', favorite_team: 'Sevilla' },
        { ...base, id: '2', username: 'remoto', city: 'Madrid', favorite_team: 'Madrid' },
      ],
      { favorite_team: 'Betis', city: 'Sevilla' },
      new Set(),
      2,
    );

    assert.equal(ranked[0]?.username, 'local');
    assert.equal(ranked[0]?.match_reason, 'city');
  });

  it('en frío prioriza perfiles con Capsules públicas', () => {
    const ranked = rankDiscoverProfiles(
      [
        {
          ...base,
          id: '1',
          username: 'vacio',
          created_at: '2025-06-01T00:00:00Z',
          public_capsules_count: 0,
        },
        {
          ...base,
          id: '2',
          username: 'activo',
          created_at: '2024-01-01T00:00:00Z',
          public_capsules_count: 5,
        },
      ],
      {},
      new Set(),
      2,
    );

    assert.equal(ranked[0]?.username, 'activo');
    assert.equal(ranked[0]?.match_reason, 'active');
    assert.equal(ranked[1]?.match_reason, null);
  });
});
