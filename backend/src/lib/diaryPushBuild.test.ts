import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  anniversaryEventKey,
  buildAnniversaryPushPayload,
  buildMilestonePushPayload,
  localDayKeyInTimeZone,
  localYmdInTimeZone,
  milestoneEventKey,
} from './diaryPushBuild.js';

describe('localDayKeyInTimeZone', () => {
  it('formatea YYYY-MM-DD en la zona', () => {
    const utcNoon = new Date('2026-08-12T12:00:00.000Z');
    assert.equal(localDayKeyInTimeZone(utcNoon, 'UTC'), '2026-08-12');
    assert.deepEqual(localYmdInTimeZone(utcNoon, 'UTC'), {
      year: 2026,
      month: 8,
      day: 12,
    });
  });
});

describe('event keys + payloads', () => {
  it('claves estables', () => {
    assert.equal(anniversaryEventKey('2026-08-12'), '2026-08-12');
    assert.equal(milestoneEventKey(25), '25');
  });

  it('arma payload de aniversario', () => {
    const payload = buildAnniversaryPushPayload({
      capsuleId: 'c1',
      yearsAgo: 2,
      matchLabel: 'A–B',
      watchedAt: '2024-08-12',
      rating: 5,
      notePreview: null,
      extrasCount: 0,
      title: 'Tal día como hoy',
      body: 'Hace 2 años viste A–B.',
      href: '/c/c1',
    });
    assert.equal(payload.title, 'Tal día como hoy');
    assert.equal(payload.url, '/c/c1');
    assert.match(payload.body, /A–B/);
  });

  it('arma payload de hito', () => {
    const payload = buildMilestonePushPayload({
      threshold: 10,
      totalMatches: 12,
      title: '10 partidos en el diario',
      body: 'Ya van 12.',
      href: '/capsules',
    });
    assert.equal(payload.title, '10 partidos en el diario');
    assert.equal(payload.url, '/capsules');
  });
});
