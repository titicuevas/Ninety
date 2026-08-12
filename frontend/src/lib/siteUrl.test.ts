import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_SITE_URL, inviteShareUrl, publicCollectionUrl, publicDiaryMonthUrl, publicProfileUrl, siteUrl } from './siteUrl.ts';

describe('siteUrl', () => {
  it('expone fallback Railway legacy sin barra final', () => {
    assert.equal(DEFAULT_SITE_URL, 'https://ninety.up.railway.app');
    assert.equal(siteUrl(), DEFAULT_SITE_URL);
  });

  it('arma URLs públicas sin barra final duplicada', () => {
    assert.equal(publicProfileUrl('aficionado_demo'), `${DEFAULT_SITE_URL}/u/aficionado_demo`);
    assert.equal(
      publicCollectionUrl('aficionado_demo', 'clasicos'),
      `${DEFAULT_SITE_URL}/u/aficionado_demo/lists/clasicos`,
    );
    assert.equal(inviteShareUrl('aficionado_demo'), `${DEFAULT_SITE_URL}/invite/aficionado_demo`);
    assert.equal(
      publicDiaryMonthUrl('aficionado_demo', 2026, 8),
      `${DEFAULT_SITE_URL}/u/aficionado_demo/calendar/2026/8`,
    );
  });
});
