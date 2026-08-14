import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCapsuleShareText, capsuleShareSummaryFrom } from './capsuleShare.ts';
import { DEFAULT_SITE_URL } from './siteUrl.ts';

describe('buildCapsuleShareText', () => {
  it('incluye partido, rating, nota y enlace', () => {
    const text = buildCapsuleShareText({
      capsuleId: 'cap-1',
      homeTeam: 'Betis',
      awayTeam: 'Sevilla',
      homeScore: 2,
      awayScore: 1,
      competition: 'LaLiga',
      rating: 5,
      note: 'Qué derbi',
      authorDisplayName: 'Henry',
      authorUsername: 'henry_madridista',
    });

    assert.match(text, /Betis 2 – 1 Sevilla · Ninety/);
    assert.match(text, /Capsule de Henry/);
    assert.match(text, /LaLiga/);
    assert.match(text, /5★/);
    assert.match(text, /Qué derbi/);
    assert.match(text, new RegExp(`${DEFAULT_SITE_URL}/c/cap-1`));
  });

  it('omite extras vacíos y trunca nota larga', () => {
    const long = 'x'.repeat(140);
    const text = buildCapsuleShareText({
      capsuleId: 'cap-2',
      homeTeam: 'Madrid',
      awayTeam: 'Barça',
      note: long,
    });
    assert.match(text, /Madrid vs Barça · Ninety/);
    assert.doesNotMatch(text, /Capsule de/);
    assert.doesNotMatch(text, /★/);
    assert.match(text, /…/);
    assert.ok(!text.includes(long));
  });
});

describe('capsuleShareSummaryFrom', () => {
  it('mapea Capsule y autor', () => {
    const summary = capsuleShareSummaryFrom(
      {
        id: 'c1',
        home_team_name: 'A',
        away_team_name: 'B',
        home_score: 1,
        away_score: 0,
        competition_name: 'Copa',
        rating: 4,
        note: 'Gol',
      },
      { display_name: 'Ana', username: 'ana' },
    );
    assert.equal(summary.capsuleId, 'c1');
    assert.equal(summary.authorDisplayName, 'Ana');
    assert.equal(summary.competition, 'Copa');
  });
});
