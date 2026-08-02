import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canFetchNextPage, INFINITE_SCROLL_ROOT_MARGIN } from './infiniteScroll.ts';

describe('canFetchNextPage', () => {
  it('permite fetch cuando hay siguiente página y no está cargando', () => {
    assert.equal(
      canFetchNextPage({ hasNextPage: true, isFetchingNextPage: false }),
      true,
    );
  });

  it('bloquea si no hay más páginas', () => {
    assert.equal(
      canFetchNextPage({ hasNextPage: false, isFetchingNextPage: false }),
      false,
    );
  });

  it('bloquea mientras se carga la siguiente página', () => {
    assert.equal(
      canFetchNextPage({ hasNextPage: true, isFetchingNextPage: true }),
      false,
    );
  });

  it('respeta enabled=false', () => {
    assert.equal(
      canFetchNextPage({
        enabled: false,
        hasNextPage: true,
        isFetchingNextPage: false,
      }),
      false,
    );
  });
});

describe('INFINITE_SCROLL_ROOT_MARGIN', () => {
  it('define un margen de prefetch vertical', () => {
    assert.match(INFINITE_SCROLL_ROOT_MARGIN, /^\d+px 0px$/);
  });
});
