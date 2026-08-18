import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { followActivityAlsoWatched, followActivityEngagementMeta, pickEngagedActivityPreview, summarizeFollowActivityEvent } from './followActivitySummary.ts';

const actor = {
  id: 'a1',
  username: 'fan01',
  display_name: 'Fan Uno',
  avatar_url: null,
};

describe('followActivitySummary', () => {
  it('resume likes y comentarios en Capsules', () => {
    const like = summarizeFollowActivityEvent({
      id: '1',
      type: 'capsule_like',
      occurred_at: '2026-01-01T00:00:00.000Z',
      actor,
      capsule: {
        id: 'c1',
        home_team_name: 'Real Madrid CF',
        away_team_name: 'FC Barcelona',
        competition_name: 'La Liga',
        rating: 4,
        photo_urls: null,
        watched_at: '2024-04-21',
      },
    });
    assert.equal(like.action, 'le gustó');
    assert.equal(like.href, '/c/c1');
    assert.match(like.label, /Real Madrid CF vs FC Barcelona/);

    const comment = summarizeFollowActivityEvent({
      id: '2',
      type: 'capsule_comment',
      occurred_at: '2026-01-01T00:00:00.000Z',
      actor,
      comment_body: 'Qué partidazo',
      capsule: {
        id: 'c1',
        home_team_name: 'Real Madrid CF',
        away_team_name: 'FC Barcelona',
        competition_name: 'La Liga',
        rating: 4,
        photo_urls: null,
        watched_at: '2024-04-21',
      },
    });
    assert.equal(comment.action, 'comentó en');
    assert.equal(comment.href, '/c/c1#comments');
  });

  it('resume listas públicas con slug', () => {
    const summary = summarizeFollowActivityEvent({
      id: '3',
      type: 'collection_like',
      occurred_at: '2026-01-01T00:00:00.000Z',
      actor,
      collection: {
        id: 'col1',
        name: 'Favoritos',
        slug: 'favoritos-seed',
        description: null,
        author_username: 'beta_ninety',
      },
    });
    assert.equal(summary.action, 'le gustó');
    assert.equal(summary.href, '/u/beta_ninety/lists/favoritos-seed');
    assert.equal(summary.label, 'Favoritos');
  });

  it('formatea likes y comentarios del objetivo', () => {
    assert.equal(
      followActivityEngagementMeta({
        id: '1',
        type: 'capsule_like',
        occurred_at: '2026-01-01T00:00:00.000Z',
        actor,
        capsule: {
          id: 'c1',
          home_team_name: 'Real Madrid CF',
          away_team_name: 'FC Barcelona',
          competition_name: 'La Liga',
          rating: 4,
          photo_urls: null,
          watched_at: '2024-04-21',
          likes_count: 2,
          comments_count: 1,
        },
      }),
      '2 me gusta · 1 comentario',
    );
    assert.equal(
      followActivityEngagementMeta({
        id: '3',
        type: 'collection_like',
        occurred_at: '2026-01-01T00:00:00.000Z',
        actor,
        collection: {
          id: 'col1',
          name: 'Favoritos',
          slug: 'favoritos-seed',
          description: null,
          author_username: 'beta_ninety',
          likes_count: 0,
          comments_count: 0,
        },
      }),
      '',
    );
  });

  it('devuelve also_watched de Capsules y vacío en listas', () => {
    const people = [
      {
        id: 'u2',
        username: 'fan02',
        display_name: 'Fan Dos',
        avatar_url: null,
        capsule_id: 'c2',
      },
    ];
    assert.equal(
      followActivityAlsoWatched({
        id: '1',
        type: 'capsule_like',
        occurred_at: '2026-01-01T00:00:00.000Z',
        actor,
        capsule: {
          id: 'c1',
          home_team_name: 'Real Madrid CF',
          away_team_name: 'FC Barcelona',
          competition_name: 'La Liga',
          rating: 4,
          photo_urls: null,
          watched_at: '2024-04-21',
          also_watched: people,
        },
      }).length,
      1,
    );
    assert.deepEqual(
      followActivityAlsoWatched({
        id: '3',
        type: 'collection_like',
        occurred_at: '2026-01-01T00:00:00.000Z',
        actor,
        collection: {
          id: 'col1',
          name: 'Favoritos',
          slug: 'favoritos-seed',
          description: null,
          author_username: 'beta_ninety',
        },
      }),
      [],
    );
  });

  it('prioriza eventos con likes o also_watched en el preview', () => {
    const quiet = {
      id: 'c1',
      home_team_name: 'Betis',
      away_team_name: 'Sevilla',
      competition_name: null,
      rating: null,
      photo_urls: null,
      watched_at: null,
    };
    const events = [
      {
        id: 'quiet',
        type: 'capsule' as const,
        occurred_at: '2026-01-03T00:00:00.000Z',
        actor,
        capsule: quiet,
      },
      {
        id: 'liked',
        type: 'capsule_like' as const,
        occurred_at: '2026-01-02T00:00:00.000Z',
        actor,
        capsule: { ...quiet, likes_count: 2 },
      },
      {
        id: 'watched',
        type: 'capsule' as const,
        occurred_at: '2026-01-01T00:00:00.000Z',
        actor,
        capsule: {
          ...quiet,
          also_watched: [
            {
              id: 'u2',
              username: 'fan02',
              display_name: 'Fan Dos',
              avatar_url: null,
              capsule_id: 'c2',
            },
          ],
        },
      },
    ];
    assert.deepEqual(
      pickEngagedActivityPreview(events, 2).map((event) => event.id),
      ['liked', 'watched'],
    );
  });
});
