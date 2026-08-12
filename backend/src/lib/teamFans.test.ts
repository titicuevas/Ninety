import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isValidTeamSlug,
  profileMatchesTeamSlug,
  rankTeamFans,
  resolveTeamDisplayName,
  slugifyTeamName,
  teamQueryFromSlug,
  teamSlugIlikePattern,
} from './teamFans.js';

const base = {
  id: '1',
  username: 'fan',
  full_name: null as string | null,
  avatar_url: null as string | null,
  favorite_team: 'Real Betis' as string | null,
  country: null as string | null,
  city: null as string | null,
  created_at: '2025-01-01T00:00:00Z',
};

describe('slugifyTeamName', () => {
  it('normaliza acentos y espacios', () => {
    assert.equal(slugifyTeamName('Real Betis'), 'real-betis');
    assert.equal(slugifyTeamName('  Atlético de Madrid  '), 'atletico-de-madrid');
  });

  it('fallback si no hay alfanuméricos', () => {
    assert.equal(slugifyTeamName('!!!'), 'equipo');
  });
});

describe('teamQueryFromSlug / isValidTeamSlug', () => {
  it('convierte slug a consulta', () => {
    assert.equal(teamQueryFromSlug('real-betis'), 'real betis');
  });

  it('valida slugs', () => {
    assert.equal(isValidTeamSlug('betis'), true);
    assert.equal(isValidTeamSlug('real-betis'), true);
    assert.equal(isValidTeamSlug('a'), false);
    assert.equal(isValidTeamSlug('Real-Betis'), false);
    assert.equal(isValidTeamSlug('betis!'), false);
  });
});

describe('teamSlugIlikePattern', () => {
  it('prioriza token significativo largo', () => {
    assert.equal(teamSlugIlikePattern('real-betis'), '%betis%');
    assert.equal(teamSlugIlikePattern('betis'), '%betis%');
  });
});

describe('profileMatchesTeamSlug', () => {
  it('empareja slug exacto y variantes (Betis ↔ Real Betis)', () => {
    assert.equal(profileMatchesTeamSlug('Real Betis', 'real-betis'), true);
    assert.equal(profileMatchesTeamSlug('Betis', 'real-betis'), true);
    assert.equal(profileMatchesTeamSlug('Real Betis', 'betis'), true);
    assert.equal(profileMatchesTeamSlug('Sevilla', 'betis'), false);
    assert.equal(profileMatchesTeamSlug(null, 'betis'), false);
  });
});

describe('resolveTeamDisplayName', () => {
  it('prefiere el favorite_team cuyo slug coincide', () => {
    assert.equal(
      resolveTeamDisplayName('real-betis', [
        { favorite_team: 'Betis' },
        { favorite_team: 'Real Betis' },
      ]),
      'Real Betis',
    );
  });

  it('usa título del slug si no hay perfiles', () => {
    assert.equal(resolveTeamDisplayName('real-betis', []), 'Real Betis');
  });
});

describe('rankTeamFans', () => {
  it('filtra bloqueos, prioriza sin follow y pagina', () => {
    const ranked = rankTeamFans(
      [
        {
          ...base,
          id: 'blocked',
          username: 'x',
          favorite_team: 'Betis',
          public_capsules_count: 9,
        },
        {
          ...base,
          id: 'followed',
          username: 'ya',
          favorite_team: 'Betis',
          public_capsules_count: 5,
          created_at: '2025-06-01T00:00:00Z',
        },
        {
          ...base,
          id: 'active',
          username: 'nuevo',
          favorite_team: 'Real Betis',
          public_capsules_count: 3,
          created_at: '2025-05-01T00:00:00Z',
        },
        {
          ...base,
          id: 'other',
          username: 'sevi',
          favorite_team: 'Sevilla',
          public_capsules_count: 8,
        },
      ],
      'betis',
      {
        viewerId: 'me',
        blockedIds: new Set(['blocked']),
        followingIds: new Set(['followed']),
        limit: 10,
        offset: 0,
      },
    );

    assert.equal(ranked.total, 2);
    assert.equal(ranked.profiles[0]?.id, 'active');
    assert.equal(ranked.profiles[1]?.id, 'followed');
  });

  it('respeta offset/limit', () => {
    const ranked = rankTeamFans(
      [
        { ...base, id: 'a', username: 'a', favorite_team: 'Betis', public_capsules_count: 2 },
        { ...base, id: 'b', username: 'b', favorite_team: 'Betis', public_capsules_count: 1 },
      ],
      'betis',
      { limit: 1, offset: 1 },
    );
    assert.equal(ranked.total, 2);
    assert.equal(ranked.profiles.length, 1);
    assert.equal(ranked.profiles[0]?.id, 'b');
  });
});
