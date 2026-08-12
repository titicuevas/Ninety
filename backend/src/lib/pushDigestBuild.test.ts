import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPushDigestPayload,
  notificationDigestKey,
  resolvePushDigestUrl,
  type PendingNotificationRow,
} from './pushDigestBuild.js';

const base = (overrides: Partial<PendingNotificationRow>): PendingNotificationRow => ({
  id: overrides.id ?? 'n1',
  user_id: 'u1',
  type: overrides.type ?? 'like',
  actor_id: overrides.actor_id ?? 'a1',
  capsule_id: overrides.capsule_id !== undefined ? overrides.capsule_id : 'c1',
  body: overrides.body !== undefined ? overrides.body : null,
  created_at: overrides.created_at ?? '2025-08-12T10:00:00.000Z',
});

describe('notificationDigestKey', () => {
  it('agrupa follows y separa por cápsula', () => {
    assert.equal(notificationDigestKey({ type: 'follow', capsule_id: null }), 'follow');
    assert.equal(notificationDigestKey({ type: 'like', capsule_id: 'c1' }), 'like:c1');
    assert.equal(notificationDigestKey({ type: 'comment', capsule_id: 'c2' }), 'comment:c2');
  });
});

describe('buildPushDigestPayload', () => {
  const actorNames = new Map([
    ['a1', 'Ana'],
    ['a2', 'Luis'],
    ['a3', 'Pepe'],
  ]);
  const actorUsernames = new Map([
    ['a1', 'ana'],
    ['a2', 'luis'],
    ['a3', 'pepe'],
  ]);
  const matchLabels = new Map([['c1', 'Betis vs Sevilla']]);
  const baseParams = { actorNames, actorUsernames, matchLabels };

  it('una alerta mantiene el formato individual', () => {
    const payload = buildPushDigestPayload({
      notifications: [base({ actor_id: 'a1' })],
      ...baseParams,
    });
    assert.deepEqual(payload, {
      title: 'Nuevo like',
      body: 'A Ana le gustó Betis vs Sevilla',
      url: '/c/c1',
    });
  });

  it('like único enlaza a la cápsula', () => {
    const payload = buildPushDigestPayload({
      notifications: [base({ type: 'like', capsule_id: 'c9', actor_id: 'a1' })],
      ...baseParams,
    });
    assert.equal(payload?.url, '/c/c9');
  });

  it('comentario único enlaza a #comments', () => {
    const payload = buildPushDigestPayload({
      notifications: [
        base({ type: 'comment', capsule_id: 'c9', actor_id: 'a1', body: 'Golazo' }),
      ],
      ...baseParams,
    });
    assert.equal(payload?.url, '/c/c9#comments');
  });

  it('mención única enlaza a #comments', () => {
    const payload = buildPushDigestPayload({
      notifications: [
        base({ type: 'mention', capsule_id: 'c9', actor_id: 'a1', body: 'Hola @pepe' }),
      ],
      ...baseParams,
    });
    assert.equal(payload?.title, 'Te mencionaron');
    assert.equal(payload?.url, '/c/c9#comments');
    assert.match(payload?.body ?? '', /mencionó/);
  });

  it('follow único enlaza al perfil', () => {
    const payload = buildPushDigestPayload({
      notifications: [base({ type: 'follow', capsule_id: null, actor_id: 'a1' })],
      ...baseParams,
    });
    assert.equal(payload?.url, '/u/ana');
  });

  it('varios likes en la misma cápsula se agrupan', () => {
    const payload = buildPushDigestPayload({
      notifications: [
        base({ id: 'n1', actor_id: 'a1', created_at: '2025-08-12T10:01:00.000Z' }),
        base({ id: 'n2', actor_id: 'a2', created_at: '2025-08-12T10:00:00.000Z' }),
      ],
      ...baseParams,
    });
    assert.equal(payload?.title, 'Nuevo like');
    assert.equal(payload?.body, 'Ana y Luis les gustó tu cápsula (Betis vs Sevilla)');
    assert.equal(payload?.url, '/c/c1');
  });

  it('tres actores muestra "y N más"', () => {
    const payload = buildPushDigestPayload({
      notifications: [
        base({ id: 'n1', actor_id: 'a1' }),
        base({ id: 'n2', actor_id: 'a2' }),
        base({ id: 'n3', actor_id: 'a3' }),
      ],
      ...baseParams,
    });
    assert.match(payload?.body ?? '', /Ana, Luis y 1 más/);
    assert.equal(payload?.url, '/c/c1');
  });

  it('varios grupos genera resumen con desglose', () => {
    const payload = buildPushDigestPayload({
      notifications: [
        base({ id: 'n1', type: 'like', capsule_id: 'c1' }),
        base({ id: 'n2', type: 'like', capsule_id: 'c2', actor_id: 'a2' }),
        base({ id: 'n3', type: 'comment', capsule_id: 'c1', actor_id: 'a1' }),
        base({ id: 'n4', type: 'follow', capsule_id: null, actor_id: 'a3' }),
      ],
      ...baseParams,
    });
    assert.equal(payload?.title, 'Ninety');
    assert.equal(payload?.body, '4 alertas nuevas: 2 likes, 1 comentario, 1 follow');
    assert.equal(payload?.url, '/notifications');
  });

  it('follow agrupado sin cápsula va a notificaciones', () => {
    const payload = buildPushDigestPayload({
      notifications: [
        base({ id: 'n1', type: 'follow', capsule_id: null, actor_id: 'a1' }),
        base({ id: 'n2', type: 'follow', capsule_id: null, actor_id: 'a2' }),
      ],
      ...baseParams,
    });
    assert.equal(payload?.title, 'Nuevo seguidor');
    assert.equal(payload?.body, 'Ana y Luis te empezaron a seguir');
    assert.equal(payload?.url, '/notifications');
  });
});

describe('resolvePushDigestUrl', () => {
  const actorUsernames = new Map([['a1', 'ana']]);

  it('follow múltiple va a notificaciones', () => {
    assert.equal(
      resolvePushDigestUrl({
        type: 'follow',
        capsule_id: null,
        actorIds: ['a1', 'a2'],
        actorUsernames,
      }),
      '/notifications',
    );
  });
});
