import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ACHIEVEMENT_CATALOG,
  achievementsInputFromPublicStats,
  achievementsInputFromStats,
  computeAchievements,
  countDistinctWatchContexts,
  countUnlockedAchievements,
} from './achievements.ts';

describe('achievements', () => {
  it('catálogo tiene ids únicos', () => {
    const ids = ACHIEVEMENT_CATALOG.map((d) => d.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('desbloquea umbrales de partidos y 5★', () => {
    const list = computeAchievements({
      totalMatches: 10,
      fiveStarCount: 1,
      stadiumVisits: 0,
      photosCount: 0,
    });
    const byId = Object.fromEntries(list.map((a) => [a.id, a]));
    assert.equal(byId.first_capsule?.unlocked, true);
    assert.equal(byId.matches_5?.unlocked, true);
    assert.equal(byId.matches_10?.unlocked, true);
    assert.equal(byId.matches_25?.unlocked, false);
    assert.equal(byId.matches_25?.progress, 10);
    assert.equal(byId.five_star?.unlocked, true);
    assert.equal(byId.five_star_5?.unlocked, false);
  });

  it('omite logros cuya métrica no está disponible', () => {
    const list = computeAchievements({
      totalMatches: 3,
      fiveStarCount: 0,
      stadiumVisits: 1,
      photosCount: 2,
    });
    assert.ok(!list.some((a) => a.id === 'chronicler'));
    assert.ok(!list.some((a) => a.id === 'streak_3'));
    assert.ok(!list.some((a) => a.id === 'versatile'));
    assert.ok(!list.some((a) => a.id === 'social'));
    assert.ok(list.some((a) => a.id === 'stadium' && a.unlocked));
  });

  it('incluye notas, racha, contextos y follows cuando hay datos', () => {
    const list = computeAchievements({
      totalMatches: 5,
      fiveStarCount: 0,
      stadiumVisits: 0,
      photosCount: 0,
      notesCount: 5,
      longestStreak: 7,
      distinctWatchContexts: 3,
      followingCount: 1,
      followersCount: 5,
    });
    const unlocked = new Set(list.filter((a) => a.unlocked).map((a) => a.id));
    assert.ok(unlocked.has('chronicler'));
    assert.ok(unlocked.has('streak_3'));
    assert.ok(unlocked.has('streak_7'));
    assert.ok(unlocked.has('versatile'));
    assert.ok(unlocked.has('social'));
    assert.ok(unlocked.has('popular'));
  });

  it('countDistinctWatchContexts ignora valores inválidos', () => {
    assert.equal(
      countDistinctWatchContexts([
        { watch_context: 'stadium' },
        { watch_context: 'tv' },
        { watch_context: 'stadium' },
        { watch_context: null },
        { watch_context: 'pub' },
        { watch_context: 'unknown' },
      ]),
      3,
    );
  });

  it('achievementsInputFromStats rellena contextos y sociales', () => {
    const input = achievementsInputFromStats(
      {
        totalMatches: 2,
        fiveStarCount: 0,
        stadiumVisits: 1,
        photosCount: 0,
        notesCount: 1,
        longestStreak: 2,
      },
      {
        capsules: [{ watch_context: 'tv' }, { watch_context: 'pub' }],
        followingCount: 3,
        followersCount: 0,
      },
    );
    assert.equal(input.distinctWatchContexts, 2);
    assert.equal(input.followingCount, 3);
    assert.equal(input.notesCount, 1);
  });

  it('achievementsInputFromPublicStats no inventa notas ni racha', () => {
    const input = achievementsInputFromPublicStats(
      { totalMatches: 8, fiveStarCount: 2, stadiumVisits: 1, photosCount: 4 },
      { followingCount: 2, followersCount: 4 },
    );
    assert.equal(input.notesCount, undefined);
    assert.equal(input.longestStreak, undefined);
    assert.equal(input.followersCount, 4);
    const list = computeAchievements(input);
    assert.ok(list.some((a) => a.id === 'matches_5' && a.unlocked));
    assert.ok(!list.some((a) => a.id === 'chronicler'));
  });

  it('countUnlockedAchievements cuenta solo desbloqueados', () => {
    const list = computeAchievements({
      totalMatches: 1,
      fiveStarCount: 0,
      stadiumVisits: 0,
      photosCount: 0,
    });
    assert.equal(countUnlockedAchievements(list), 1);
  });
});
