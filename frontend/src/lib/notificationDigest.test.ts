import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  digestActionText,
  digestFollowBackActor,
  digestUnreadIds,
  formatDigestActorNames,
  groupNotificationsForDigest,
  notificationDigestKey,
  type DigestNotificationInput,
} from './notificationDigest.ts';

function n(
  partial: Partial<DigestNotificationInput> & Pick<DigestNotificationInput, 'id' | 'type' | 'actor_id'>,
): DigestNotificationInput {
  return {
    capsule_id: partial.capsule_id ?? null,
    body: partial.body ?? null,
    read: partial.read ?? false,
    created_at: partial.created_at ?? '2026-08-11T12:00:00.000Z',
    actor: partial.actor ?? {
      username: partial.actor_id,
      display_name: partial.actor_id.toUpperCase(),
      avatar_url: null,
    },
    capsule: partial.capsule ?? null,
    ...partial,
  };
}

describe('notificationDigestKey', () => {
  it('agrupa likes/comentarios por cápsula y follows juntos', () => {
    assert.equal(notificationDigestKey({ type: 'like', capsule_id: 'c1' }), 'like:c1');
    assert.equal(notificationDigestKey({ type: 'comment', capsule_id: 'c1' }), 'comment:c1');
    assert.equal(notificationDigestKey({ type: 'follow', capsule_id: null }), 'follow');
    assert.equal(notificationDigestKey({ type: 'like', capsule_id: null }), 'like:none');
  });

  it('agrupa comentarios de colección por collection_id', () => {
    assert.equal(
      notificationDigestKey({
        type: 'comment',
        capsule_id: null,
        collection_id: 'list-1',
      }),
      'comment:collection:list-1',
    );
  });
});

describe('formatDigestActorNames / digestActionText', () => {
  it('formatea nombres y plurales', () => {
    assert.equal(
      formatDigestActorNames([
        { id: '1', username: 'ana', display_name: 'Ana', avatar_url: null },
      ]),
      'Ana',
    );
    assert.equal(
      formatDigestActorNames([
        { id: '1', username: 'ana', display_name: 'Ana', avatar_url: null },
        { id: '2', username: 'luis', display_name: 'Luis', avatar_url: null },
      ]),
      'Ana y Luis',
    );
    assert.equal(
      formatDigestActorNames([
        { id: '1', username: 'ana', display_name: 'Ana', avatar_url: null },
        { id: '2', username: 'luis', display_name: 'Luis', avatar_url: null },
        { id: '3', username: 'mia', display_name: 'Mia', avatar_url: null },
        { id: '4', username: 'leo', display_name: 'Leo', avatar_url: null },
      ]),
      'Ana, Luis y 2 más',
    );
    assert.equal(digestActionText('like', 1), 'le gustó tu cápsula');
    assert.equal(digestActionText('like', 3), 'les gustó tu cápsula');
    assert.equal(digestActionText('comment', 2), 'comentaron en tu cápsula');
    assert.equal(
      digestActionText('comment', 1, { onCollection: true }),
      'comentó en tu lista',
    );
    assert.equal(digestActionText('mention', 1), 'te mencionó en un comentario');
    assert.equal(digestActionText('follow', 2), 'te empezaron a seguir');
  });
});

describe('groupNotificationsForDigest', () => {
  it('agrupa likes de la misma cápsula y conserva orden por recencia', () => {
    const groups = groupNotificationsForDigest([
      n({
        id: '1',
        type: 'like',
        actor_id: 'a',
        capsule_id: 'c1',
        created_at: '2026-08-11T15:00:00.000Z',
        actor: { username: 'ana', display_name: 'Ana', avatar_url: null },
        capsule: {
          id: 'c1',
          home_team_name: 'Betis',
          away_team_name: 'Sevilla',
          competition_name: 'LaLiga',
          thumb_url: null,
        },
      }),
      n({
        id: '2',
        type: 'follow',
        actor_id: 'b',
        created_at: '2026-08-11T14:00:00.000Z',
        actor: { username: 'bob', display_name: 'Bob', avatar_url: null },
      }),
      n({
        id: '3',
        type: 'like',
        actor_id: 'c',
        capsule_id: 'c1',
        created_at: '2026-08-11T13:00:00.000Z',
        read: true,
        actor: { username: 'carla', display_name: 'Carla', avatar_url: null },
        capsule: {
          id: 'c1',
          home_team_name: 'Betis',
          away_team_name: 'Sevilla',
          competition_name: 'LaLiga',
          thumb_url: null,
        },
      }),
      n({
        id: '4',
        type: 'follow',
        actor_id: 'd',
        created_at: '2026-08-11T12:00:00.000Z',
        actor: { username: 'dia', display_name: 'Dia', avatar_url: null },
      }),
    ]);

    assert.equal(groups.length, 2);
    assert.equal(groups[0]!.key, 'like:c1');
    assert.equal(groups[0]!.actors.map((a) => a.display_name).join(','), 'Ana,Carla');
    assert.equal(groups[0]!.unread, true);
    assert.deepEqual(digestUnreadIds(groups[0]!), ['1']);
    assert.equal(groups[1]!.key, 'follow');
    assert.equal(groups[1]!.actors.length, 2);
    assert.equal(digestActionText(groups[1]!.type, groups[1]!.actors.length), 'te empezaron a seguir');
  });

  it('no mezcla likes y comentarios de la misma cápsula', () => {
    const groups = groupNotificationsForDigest([
      n({ id: '1', type: 'like', actor_id: 'a', capsule_id: 'c1' }),
      n({
        id: '2',
        type: 'comment',
        actor_id: 'b',
        capsule_id: 'c1',
        body: 'Qué partidazo',
        created_at: '2026-08-11T16:00:00.000Z',
      }),
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0]!.type, 'comment');
    assert.equal(groups[0]!.latestBody, 'Qué partidazo');
    assert.equal(groups[1]!.type, 'like');
  });

  it('propaga followed_by_me en actores del digest', () => {
    const groups = groupNotificationsForDigest([
      n({
        id: '1',
        type: 'follow',
        actor_id: 'b',
        actor: {
          username: 'bob',
          display_name: 'Bob',
          avatar_url: null,
          followed_by_me: true,
        },
      }),
    ]);
    assert.equal(groups[0]!.actors[0]!.followed_by_me, true);
  });
});

describe('digestFollowBackActor', () => {
  it('solo en follow de un actor con username', () => {
    const single = groupNotificationsForDigest([
      n({
        id: '1',
        type: 'follow',
        actor_id: 'b',
        actor: { username: 'bob', display_name: 'Bob', avatar_url: null, followed_by_me: false },
      }),
    ])[0]!;
    const actor = digestFollowBackActor(single);
    assert.equal(actor?.username, 'bob');
    assert.equal(actor?.followed_by_me, false);

    const multi = groupNotificationsForDigest([
      n({
        id: '1',
        type: 'follow',
        actor_id: 'b',
        actor: { username: 'bob', display_name: 'Bob', avatar_url: null },
      }),
      n({
        id: '2',
        type: 'follow',
        actor_id: 'c',
        actor: { username: 'carla', display_name: 'Carla', avatar_url: null },
      }),
    ])[0]!;
    assert.equal(digestFollowBackActor(multi), null);

    const like = groupNotificationsForDigest([
      n({ id: '1', type: 'like', actor_id: 'a', capsule_id: 'c1' }),
    ])[0]!;
    assert.equal(digestFollowBackActor(like), null);
  });
});
