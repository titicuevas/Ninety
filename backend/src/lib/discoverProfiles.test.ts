import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rankDiscoverProfiles } from './discoverProfiles.js';

const base = {
  avatar_url: null,
  favorite_team: null as string | null,
  country: null as string | null,
  city: null as string | null,
  created_at: '2025-01-01T00:00:00Z',
  full_name: null,
};

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
});
