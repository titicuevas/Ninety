import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildEmailDigestContent,
  isLocalMonday,
  isoWeekKeyInTimeZone,
} from './emailDigestBuild.js';

describe('isLocalMonday / isoWeekKeyInTimeZone', () => {
  it('detecta lunes en UTC', () => {
    // 2026-08-10 was a Monday
    const monday = new Date('2026-08-10T12:00:00.000Z');
    const tuesday = new Date('2026-08-11T12:00:00.000Z');
    assert.equal(isLocalMonday(monday, 'UTC'), true);
    assert.equal(isLocalMonday(tuesday, 'UTC'), false);
  });

  it('clave ISO estable', () => {
    const monday = new Date('2026-08-10T12:00:00.000Z');
    assert.equal(isoWeekKeyInTimeZone(monday, 'UTC'), '2026-W33');
  });
});

describe('buildEmailDigestContent', () => {
  const now = new Date('2026-08-10T12:00:00.000Z');

  it('resumen con Capsules de la semana + CTA calendario', () => {
    const content = buildEmailDigestContent(
      [
        {
          id: '1',
          watched_at: '2026-08-08T18:00:00.000Z',
          home_team_name: 'Betis',
          away_team_name: 'Sevilla',
          rating: 4,
        },
        {
          id: '2',
          watched_at: '2026-08-09T18:00:00.000Z',
          home_team_name: 'Madrid',
          away_team_name: 'Barça',
          rating: 5,
        },
      ],
      { now, timeZone: 'UTC' },
    );
    assert.equal(content.kind, 'summary');
    assert.equal(content.weekCount, 2);
    assert.equal(content.avgRating, 4.5);
    assert.equal(content.cta.href, '/diary/calendar');
    assert.equal(content.weekKey, '2026-W33');
  });

  it('nudge si la semana está vacía', () => {
    const content = buildEmailDigestContent(
      [
        {
          id: '1',
          watched_at: '2026-07-01T18:00:00.000Z',
          home_team_name: 'A',
          away_team_name: 'B',
          rating: 3,
        },
      ],
      { now, timeZone: 'UTC' },
    );
    assert.equal(content.kind, 'nudge');
    assert.equal(content.weekCount, 0);
    assert.ok(content.cta.href === '/collections/explore' || content.cta.href === '/want-to-go');
  });

  it('nudge de diario vacío → añadir Capsule', () => {
    const content = buildEmailDigestContent([], { now, timeZone: 'UTC' });
    assert.equal(content.kind, 'nudge');
    assert.equal(content.cta.href, '/search');
    assert.equal(content.cta.label, 'Añadir Capsule');
  });
});
