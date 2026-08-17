import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  activityCommentSnippet,
  mergeFollowActivityCandidates,
  paginateFollowActivity,
  visibleCapsuleCommentCandidates,
  visibleCapsuleLikeCandidates,
  visibleCollectionCommentCandidates,
  visibleCollectionLikeCandidates,
  type FollowActivityCandidate,
} from './followActivity.js';

const capsule = (
  id: string,
  occurred_at: string,
  user_id = 'u1',
): FollowActivityCandidate => ({
  kind: 'capsule',
  id,
  user_id,
  occurred_at,
  home_team_name: 'Betis',
  away_team_name: 'Sevilla',
  competition_name: 'LaLiga',
  rating: 8,
  photo_urls: null,
  watched_at: occurred_at,
});

const collection = (
  id: string,
  occurred_at: string,
  user_id = 'u2',
): FollowActivityCandidate => ({
  kind: 'collection',
  id,
  user_id,
  occurred_at,
  name: 'Clásicos',
  slug: 'clasicos',
  description: null,
  author_username: 'u2',
});

const capsuleLike = (
  id: string,
  occurred_at: string,
  user_id = 'u3',
): FollowActivityCandidate => ({
  kind: 'capsule_like',
  id,
  user_id,
  occurred_at,
  capsule_id: id.split(':')[1] ?? id,
  home_team_name: 'Betis',
  away_team_name: 'Sevilla',
  competition_name: 'LaLiga',
  rating: 8,
  photo_urls: null,
  watched_at: occurred_at,
});

const capsuleComment = (
  id: string,
  occurred_at: string,
  user_id = 'u4',
): FollowActivityCandidate => ({
  kind: 'capsule_comment',
  id,
  user_id,
  occurred_at,
  capsule_id: 'c1',
  comment_body: 'Qué partidazo',
  home_team_name: 'Betis',
  away_team_name: 'Sevilla',
  competition_name: 'LaLiga',
  rating: 8,
  photo_urls: null,
  watched_at: occurred_at,
});

describe('mergeFollowActivityCandidates', () => {
  it('ordena por occurred_at descendente', () => {
    const merged = mergeFollowActivityCandidates([
      capsule('c1', '2025-01-01T10:00:00Z'),
      collection('l1', '2025-02-01T10:00:00Z'),
      capsule('c2', '2025-01-15T10:00:00Z'),
    ]);

    assert.deepEqual(
      merged.map((row) => row.id),
      ['l1', 'c2', 'c1'],
    );
  });

  it('ante empate de tiempo prioriza capsule sobre collection', () => {
    const ts = '2025-03-01T12:00:00Z';
    const merged = mergeFollowActivityCandidates([
      collection('l1', ts),
      capsule('c1', ts),
    ]);

    assert.equal(merged[0]?.kind, 'capsule');
    assert.equal(merged[1]?.kind, 'collection');
  });

  it('ante empate prioriza publicar frente a me gusta', () => {
    const ts = '2025-03-01T12:00:00Z';
    const merged = mergeFollowActivityCandidates([
      capsuleLike('u3:c1', ts),
      capsule('c1', ts),
    ]);
    assert.equal(merged[0]?.kind, 'capsule');
    assert.equal(merged[1]?.kind, 'capsule_like');
  });

  it('ante empate prioriza me gusta frente a comentario', () => {
    const ts = '2025-03-01T12:00:00Z';
    const merged = mergeFollowActivityCandidates([
      capsuleComment('cm1', ts),
      capsuleLike('u3:c1', ts),
    ]);
    assert.equal(merged[0]?.kind, 'capsule_like');
    assert.equal(merged[1]?.kind, 'capsule_comment');
  });
});

describe('activityCommentSnippet', () => {
  it('recorta y colapsa espacios', () => {
    assert.equal(activityCommentSnippet('  hola   mundo  '), 'hola mundo');
    const long = 'a'.repeat(160);
    const snippet = activityCommentSnippet(long);
    assert.equal(snippet.endsWith('…'), true);
    assert.equal(snippet.length, 140);
  });
});

describe('paginateFollowActivity', () => {
  it('aplica offset y limit', () => {
    const items = [1, 2, 3, 4, 5];
    assert.deepEqual(paginateFollowActivity(items, 1, 2), [2, 3]);
    assert.deepEqual(paginateFollowActivity(items, 4, 10), [5]);
    assert.deepEqual(paginateFollowActivity(items, 10, 2), []);
  });

  it('normaliza offset/limit negativos', () => {
    assert.deepEqual(paginateFollowActivity([1, 2, 3], -2, 2), [1, 2]);
    assert.deepEqual(paginateFollowActivity([1, 2, 3], 0, -1), []);
  });
});

describe('visibleCapsuleLikeCandidates', () => {
  const capsule = {
    id: 'c1',
    user_id: 'owner',
    is_public: true,
    home_team_name: 'Betis',
    away_team_name: 'Sevilla',
    competition_name: null,
    rating: null,
    photo_urls: null,
    watched_at: null,
  };

  it('omite privadas, propias y bloqueadas', () => {
    const likes = [
      { user_id: 'f1', capsule_id: 'c1', created_at: '2026-01-01T00:00:00Z' },
      { user_id: 'f1', capsule_id: 'missing', created_at: '2026-01-01T00:00:00Z' },
    ];
    const visible = visibleCapsuleLikeCandidates(
      likes,
      new Map([['c1', capsule]]),
      new Set(),
      'me',
    );
    assert.equal(visible.length, 1);
    assert.equal(visible[0]?.capsule_id, 'c1');

    assert.equal(
      visibleCapsuleLikeCandidates(
        likes,
        new Map([['c1', { ...capsule, is_public: false }]]),
        new Set(),
        'me',
      ).length,
      0,
    );
    assert.equal(
      visibleCapsuleLikeCandidates(likes, new Map([['c1', capsule]]), new Set(), 'owner')
        .length,
      0,
    );
    assert.equal(
      visibleCapsuleLikeCandidates(
        likes,
        new Map([['c1', capsule]]),
        new Set(['owner']),
        'me',
      ).length,
      0,
    );
  });
});

describe('visibleCollectionLikeCandidates', () => {
  it('rellena author_username del dueño', () => {
    const visible = visibleCollectionLikeCandidates(
      [{ user_id: 'f1', collection_id: 'l1', created_at: '2026-01-01T00:00:00Z' }],
      new Map([
        [
          'l1',
          {
            id: 'l1',
            user_id: 'owner',
            name: 'Clásicos',
            slug: 'clasicos',
            description: null,
            is_public: true,
          },
        ],
      ]),
      new Map([['owner', 'owner_user']]),
      new Set(),
      'me',
    );
    assert.equal(visible[0]?.author_username, 'owner_user');
    assert.equal(visible[0]?.collection_id, 'l1');
  });
});

describe('visibleCapsuleCommentCandidates', () => {
  const capsule = {
    id: 'c1',
    user_id: 'owner',
    is_public: true,
    home_team_name: 'Betis',
    away_team_name: 'Sevilla',
    competition_name: null,
    rating: null,
    photo_urls: null,
    watched_at: null,
  };

  it('omite privadas, propias y bloqueadas', () => {
    const comments = [
      {
        id: 'cm1',
        user_id: 'f1',
        capsule_id: 'c1',
        body: '  gran partido  ',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'cm2',
        user_id: 'f1',
        capsule_id: 'missing',
        body: 'no',
        created_at: '2026-01-01T00:00:00Z',
      },
    ];
    const visible = visibleCapsuleCommentCandidates(
      comments,
      new Map([['c1', capsule]]),
      new Set(),
      'me',
    );
    assert.equal(visible.length, 1);
    assert.equal(visible[0]?.id, 'cm1');
    assert.equal(visible[0]?.comment_body, 'gran partido');

    assert.equal(
      visibleCapsuleCommentCandidates(
        comments,
        new Map([['c1', { ...capsule, is_public: false }]]),
        new Set(),
        'me',
      ).length,
      0,
    );
    assert.equal(
      visibleCapsuleCommentCandidates(comments, new Map([['c1', capsule]]), new Set(), 'owner')
        .length,
      0,
    );
    assert.equal(
      visibleCapsuleCommentCandidates(
        comments,
        new Map([['c1', capsule]]),
        new Set(['owner']),
        'me',
      ).length,
      0,
    );
  });
});

describe('visibleCollectionCommentCandidates', () => {
  it('rellena author_username del dueño', () => {
    const visible = visibleCollectionCommentCandidates(
      [
        {
          id: 'cm1',
          user_id: 'f1',
          collection_id: 'l1',
          body: 'brutal',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      new Map([
        [
          'l1',
          {
            id: 'l1',
            user_id: 'owner',
            name: 'Clásicos',
            slug: 'clasicos',
            description: null,
            is_public: true,
          },
        ],
      ]),
      new Map([['owner', 'owner_user']]),
      new Set(),
      'me',
    );
    assert.equal(visible[0]?.author_username, 'owner_user');
    assert.equal(visible[0]?.collection_id, 'l1');
    assert.equal(visible[0]?.comment_body, 'brutal');
  });
});
