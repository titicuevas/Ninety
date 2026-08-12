import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CONTENT_REPORT_REASON_LABELS,
  CONTENT_REPORT_REASONS,
  isContentReportReason,
  reportContentButtonLabel,
} from './reportContent.ts';

describe('reportContent', () => {
  it('etiqueta del botón según estado', () => {
    assert.equal(reportContentButtonLabel({}), 'Reportar');
    assert.equal(reportContentButtonLabel({ reported: true }), 'Reportado');
    assert.equal(reportContentButtonLabel({ reporting: true }), 'Enviando…');
    assert.equal(reportContentButtonLabel({ reported: true, reporting: true }), 'Enviando…');
  });

  it('valida motivos y tiene etiqueta para cada uno', () => {
    for (const reason of CONTENT_REPORT_REASONS) {
      assert.equal(isContentReportReason(reason), true);
      assert.ok(CONTENT_REPORT_REASON_LABELS[reason].length > 0);
    }
    assert.equal(isContentReportReason('violence'), false);
  });
});
