import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  matchesDiscoverCollectionQuery,
  parseDiscoverCollectionsSort,
  rankDiscoverCollections,
  selectDiscoverCollections,
} from './discoverCollections.js';

const author = {
  id: 'u1',
  username: 'fan',
  display_name: 'Fan',
  avatar_url: null,
  favorite_team: 'Betis',
};

const base = {
  user_id: 'u1',
  slug: 'clasicos',
  description: null,
  is_public: true,
  cover_capsule_id: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  items_count: 3,
  cover_url: null,
  author,
};

describe('rankDiscoverCollections', () => {
  it('prioriza colecciones de usuarios seguidos', () => {
    const ranked = rankDiscoverCollections(
      [
        {
          ...base,
          id: 'c1',
          name: 'Reciente',
          updated_at: '2025-06-01T00:00:00Z',
          author: { ...author, id: 'u2', username: 'nuevo', favorite_team: 'Madrid' },
        },
        {
          ...base,
          id: 'c2',
          name: 'Seguido',
          user_id: 'u3',
          updated_at: '2024-01-01T00:00:00Z',
          author: { ...author, id: 'u3', username: 'amigo', favorite_team: 'Sevilla' },
        },
      ],
      { id: 'viewer', favorite_team: 'Betis' },
      new Set(['u3']),
      2,
    );

    assert.equal(ranked[0]?.name, 'Seguido');
    assert.equal(ranked[0]?.match_reason, 'following');
  });

  it('prioriza mismo equipo favorito del autor', () => {
    const ranked = rankDiscoverCollections(
      [
        {
          ...base,
          id: 'c1',
          name: 'Otro',
          user_id: 'u2',
          author: { ...author, id: 'u2', username: 'otro', favorite_team: 'Madrid' },
        },
        {
          ...base,
          id: 'c2',
          name: 'Betico',
          user_id: 'u3',
          author: { ...author, id: 'u3', username: 'verde', favorite_team: 'Real Betis' },
        },
      ],
      { id: 'viewer', favorite_team: 'Betis' },
      new Set(),
      2,
    );

    assert.equal(ranked[0]?.name, 'Betico');
    assert.equal(ranked[0]?.match_reason, 'favorite_team');
  });

  it('excluye colecciones propias y vacías', () => {
    const ranked = rankDiscoverCollections(
      [
        { ...base, id: 'c1', name: 'Mía', user_id: 'viewer', author: { ...author, id: 'viewer' } },
        { ...base, id: 'c2', name: 'Vacía', items_count: 0 },
      ],
      { id: 'viewer' },
      new Set(),
      6,
    );

    assert.equal(ranked.length, 0);
  });

  it('en frío marca active y prioriza más Capsules', () => {
    const ranked = rankDiscoverCollections(
      [
        {
          ...base,
          id: 'c1',
          name: 'Corta',
          user_id: 'u2',
          items_count: 2,
          updated_at: '2025-06-01T00:00:00Z',
          author: { ...author, id: 'u2', username: 'corto', favorite_team: null },
        },
        {
          ...base,
          id: 'c2',
          name: 'Larga',
          user_id: 'u3',
          items_count: 12,
          updated_at: '2025-01-01T00:00:00Z',
          author: { ...author, id: 'u3', username: 'largo', favorite_team: null },
        },
      ],
      { id: 'viewer' },
      new Set(),
      2,
    );

    assert.equal(ranked[0]?.name, 'Larga');
    assert.equal(ranked[0]?.match_reason, 'active');
    assert.equal(ranked[1]?.match_reason, 'active');
  });
});

describe('selectDiscoverCollections', () => {
  it('parsea sort y filtra por q', () => {
    assert.equal(parseDiscoverCollectionsSort('likes'), 'likes');
    assert.equal(parseDiscoverCollectionsSort('nope'), 'relevant');
    assert.equal(
      matchesDiscoverCollectionQuery(
        {
          name: 'Clásicos Betis',
          description: null,
          author: { username: 'fan', display_name: 'Fan' },
        },
        'betis',
      ),
      true,
    );
  });

  it('ordena por recientes y por likes', () => {
    const pool = [
      {
        ...base,
        id: 'c1',
        name: 'Vieja',
        user_id: 'u2',
        updated_at: '2024-01-01T00:00:00Z',
        author: { ...author, id: 'u2', username: 'viejo' },
      },
      {
        ...base,
        id: 'c2',
        name: 'Nueva',
        user_id: 'u3',
        updated_at: '2025-06-01T00:00:00Z',
        author: { ...author, id: 'u3', username: 'nuevo' },
      },
    ];

    const recent = selectDiscoverCollections(pool, { id: 'viewer' }, new Set(), {
      limit: 2,
      sort: 'recent',
    });
    assert.equal(recent[0]?.name, 'Nueva');

    const likes = selectDiscoverCollections(pool, { id: 'viewer' }, new Set(), {
      limit: 2,
      sort: 'likes',
      likesCountById: new Map([
        ['c1', 9],
        ['c2', 1],
      ]),
    });
    assert.equal(likes[0]?.name, 'Vieja');
  });

  it('filtra por query de nombre o autor', () => {
    const pool = [
      {
        ...base,
        id: 'c1',
        name: 'Viajes',
        user_id: 'u2',
        author: { ...author, id: 'u2', username: 'viajero', display_name: 'Viajero' },
      },
      {
        ...base,
        id: 'c2',
        name: 'Clásicos',
        user_id: 'u3',
        author: { ...author, id: 'u3', username: 'otro', display_name: 'Otro' },
      },
    ];

    const filtered = selectDiscoverCollections(pool, { id: 'viewer' }, new Set(), {
      limit: 6,
      q: 'clasicos',
      sort: 'recent',
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.name, 'Clásicos');
  });
});
