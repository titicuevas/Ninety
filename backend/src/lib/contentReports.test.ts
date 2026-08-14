import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isContentReportReason,
  isContentReportTargetType,
  isMissingCollectionReportEnum,
  isMissingReportsTable,
  isUuid,
  normalizeReportNote,
} from './contentReports.js';

describe('contentReports helpers', () => {
  it('valida target_type y reason', () => {
    assert.equal(isContentReportTargetType('user'), true);
    assert.equal(isContentReportTargetType('capsule'), true);
    assert.equal(isContentReportTargetType('collection'), true);
    assert.equal(isContentReportTargetType('comment'), false);
    assert.equal(isContentReportReason('spam'), true);
    assert.equal(isContentReportReason('harassment'), true);
    assert.equal(isContentReportReason('hate'), true);
    assert.equal(isContentReportReason('inappropriate'), true);
    assert.equal(isContentReportReason('impersonation'), true);
    assert.equal(isContentReportReason('other'), true);
    assert.equal(isContentReportReason('violence'), false);
  });

  it('valida UUID', () => {
    assert.equal(isUuid('00000000-0000-4000-8000-000000000001'), true);
    assert.equal(isUuid('not-a-uuid'), false);
    assert.equal(isUuid(''), false);
  });

  it('normaliza nota opcional', () => {
    assert.equal(normalizeReportNote(null), null);
    assert.equal(normalizeReportNote('  '), null);
    assert.equal(normalizeReportNote('  Hola  '), 'Hola');
    assert.equal(normalizeReportNote('x'.repeat(600))?.length, 500);
  });

  it('detecta tabla ausente', () => {
    assert.equal(isMissingReportsTable({ code: '42P01', message: 'relation does not exist' }), true);
    assert.equal(
      isMissingReportsTable({ message: 'Could not find the table public.content_reports' }),
      true,
    );
    assert.equal(isMissingReportsTable({ code: '23505', message: 'duplicate key' }), false);
    assert.equal(isMissingReportsTable(new Error('network')), false);
  });

  it('detecta enum collection ausente', () => {
    assert.equal(
      isMissingCollectionReportEnum({
        code: '22P02',
        message: 'invalid input value for enum content_report_target_type: "collection"',
      }),
      true,
    );
    assert.equal(isMissingCollectionReportEnum({ code: '23505', message: 'duplicate key' }), false);
    assert.equal(
      isMissingCollectionReportEnum({
        code: '22P02',
        message: 'invalid input value for enum content_report_reason: "spamx"',
      }),
      false,
    );
  });
});
