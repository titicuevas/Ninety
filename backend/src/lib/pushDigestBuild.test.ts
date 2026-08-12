import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPushDigestPayload,
  notificationDigestKey,
  type PendingNotificationRow,
} from './pushDigestBuild.js';

const base = (overrides: Partial<PendingNotificationRow>): PendingNotificationRow => ({
  id: overrides.id ?? 'n1',
  user_id: 'u1',
  type: overrides.type ?? 'like',
  actor_id: overrides.actor_id ?? 'a1',
  capsule_id: overrides.capsule_id ?? 'c1',
  body: overrides.body ?? null,
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
  const matchLabels = new Map([['c1', 'Betis vs Sevilla']]);

  it('una alerta mantiene el formato individual', () => {
    const payload = buildPushDigestPayload({
      notifications: [base({ actor_id: 'a1' })],
      actorNames,
      matchLabels,
    });
    assert.deepEqual(payload, {
      title: 'Nuevo like',
      body: 'A Ana le gustó Betis vs Sevilla',
      url: '/notifications',
    });
  });

  it('varios likes en la misma cápsula se agrupan', () => {
    const payload = buildPushDigestPayload({
      notifications: [
        base({ id: 'n1', actor_id: 'a1', created_at: '2025-08-12T10:01:00.000Z' }),
        base({ id: 'n2', actor_id: 'a2', created_at: '2025-08-12T10:00:00.000Z' }),
      ],
      actorNames,
      matchLabels,
    });
    assert.equal(payload?.title, 'Nuevo like');
    assert.equal(payload?.body, 'Ana y Luis les gustó tu cápsula (Betis vs Sevilla)');
  });

  it('tres actores muestra "y N más"', () => {
    const payload = buildPushDigestPayload({
      notifications: [
        base({ id: 'n1', actor_id: 'a1' }),
        base({ id: 'n2', actor_id: 'a2' }),
        base({ id: 'n3', actor_id: 'a3' }),
      ],
      actorNames,
      matchLabels,
    });
    assert.match(payload?.body ?? '', /Ana, Luis y 1 más/);
  });

  it('varios grupos genera resumen con desglose', () => {
    const payload = buildPushDigestPayload({
      notifications: [
        base({ id: 'n1', type: 'like', capsule_id: 'c1' }),
        base({ id: 'n2', type: 'like', capsule_id: 'c2', actor_id: 'a2' }),
        base({ id: 'n3', type: 'comment', capsule_id: 'c1', actor_id: 'a1' }),
        base({ id: 'n4', type: 'follow', capsule_id: null, actor_id: 'a3' }),
      ],
      actorNames,
      matchLabels,
    });
    assert.equal(payload?.title, 'Ninety');
    assert.equal(payload?.body, '4 alertas nuevas: 2 likes, 1 comentario, 1 follow');
  });

  it('follow agrupado sin cápsula', () => {
    const payload = buildPushDigestPayload({
      notifications: [
        base({ id: 'n1', type: 'follow', capsule_id: null, actor_id: 'a1' }),
        base({ id: 'n2', type: 'follow', capsule_id: null, actor_id: 'a2' }),
      ],
      actorNames,
      matchLabels,
    });
    assert.equal(payload?.title, 'Nuevo seguidor');
    assert.equal(payload?.body, 'Ana y Luis te empezaron a seguir');
  });
});
