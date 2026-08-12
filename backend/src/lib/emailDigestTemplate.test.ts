import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildEmailDigestContent } from './emailDigestBuild.js';
import { renderEmailDigestMail } from './emailDigestTemplate.js';

describe('renderEmailDigestMail', () => {
  it('incluye marca, CTA y baja', () => {
    const content = buildEmailDigestContent(
      [
        {
          id: '1',
          watched_at: '2026-08-08T18:00:00.000Z',
          home_team_name: 'Betis',
          away_team_name: 'Sevilla',
          rating: 4,
        },
      ],
      { now: new Date('2026-08-10T12:00:00.000Z'), timeZone: 'UTC' },
    );
    const mail = renderEmailDigestMail(content, {
      clientUrl: 'https://www.getninety.app',
      settingsUrl: 'https://www.getninety.app/settings',
      unsubscribeUrl: 'https://api.example/api/email-digest/unsubscribe?u=1&sig=abc',
    });
    assert.match(mail.subject, /Ninety/);
    assert.match(mail.html, /#10b981/);
    assert.match(mail.html, /Ninety/);
    assert.match(mail.html, /Ver calendario/);
    assert.match(mail.html, /Darme de baja/);
    assert.match(mail.text, /Preferencias/);
    assert.match(mail.text, /Darte de baja/);
  });
});
