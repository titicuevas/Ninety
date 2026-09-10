import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildDemoPublicShowcasePayload,
  DEMO_PUBLIC_USERNAME,
  isDemoPublicUsername,
} from './demoPublicShowcaseFallback.js';

describe('demoPublicShowcaseFallback', () => {
  it('reconoce solo @beta_ninety', () => {
    assert.equal(isDemoPublicUsername('beta_ninety'), true);
    assert.equal(isDemoPublicUsername('Beta_Ninety'), true);
    assert.equal(isDemoPublicUsername('otro'), false);
    assert.equal(DEMO_PUBLIC_USERNAME, 'beta_ninety');
  });

  it('devuelve diario demo paginado con stats', () => {
    const full = buildDemoPublicShowcasePayload(20, 0);
    assert.equal(full.from_fallback, true);
    assert.equal(full.profile.username, 'beta_ninety');
    assert.ok(full.total >= 3);
    assert.equal(full.capsules.length, full.total);
    assert.ok(full.stats.totalMatches >= 3);
    assert.ok(full.stats.averageRating != null);

    const page = buildDemoPublicShowcasePayload(2, 0);
    assert.equal(page.capsules.length, 2);
    assert.equal(page.total, full.total);
  });
});
