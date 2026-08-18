import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isUuid,
  onlyUuids,
  postgrestInList,
  sanitizePostgrestSearch,
  stripHtmlTags,
} from './postgrestSafe.js';

describe('postgrestSafe', () => {
  it('acepta UUID y descarta basura en listas in()', () => {
    const ok = '66ee783c-878d-41a7-8e41-4e7d7a746b26';
    assert.equal(isUuid(ok), true);
    assert.equal(isUuid('not-a-uuid'), false);
    assert.deepEqual(onlyUuids([ok, 'abc', `${ok},or.true`]), [ok]);
    assert.equal(postgrestInList([ok]), `(${ok})`);
    assert.equal(postgrestInList(['nope']), null);
  });

  it('quita comodines y caracteres de filtro PostgREST', () => {
    assert.equal(sanitizePostgrestSearch('  La Liga  '), 'la liga');
    assert.equal(sanitizePostgrestSearch('betis%'), 'betis');
    const injected = sanitizePostgrestSearch('foo),id.eq.true');
    assert.doesNotMatch(injected, /[()",]/);
    assert.doesNotMatch(injected, /\.eq\./);
    assert.match(injected, /foo/);
  });

  it('elimina etiquetas HTML y deja comparaciones', () => {
    assert.equal(stripHtmlTags('gol <script>alert(1)</script> extra'), 'gol  extra');
    assert.equal(stripHtmlTags('Betis 2 < 3 Sevilla'), 'Betis 2 < 3 Sevilla');
  });
});
