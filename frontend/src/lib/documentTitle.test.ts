import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DOCUMENT_TITLE, formatDocumentTitle } from './documentTitle.ts';

describe('formatDocumentTitle', () => {
  it('usa el default sin página', () => {
    assert.equal(formatDocumentTitle(), DEFAULT_DOCUMENT_TITLE);
    assert.equal(formatDocumentTitle(null), DEFAULT_DOCUMENT_TITLE);
    assert.equal(formatDocumentTitle(''), DEFAULT_DOCUMENT_TITLE);
    assert.equal(formatDocumentTitle('   '), DEFAULT_DOCUMENT_TITLE);
  });

  it('añade el sufijo de marca', () => {
    assert.equal(formatDocumentTitle('Feed'), 'Feed · Ninety');
    assert.equal(formatDocumentTitle('  Ajustes  '), 'Ajustes · Ninety');
  });
});
