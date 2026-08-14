export const CONTENT_REPORT_REASONS = [
  'spam',
  'harassment',
  'hate',
  'inappropriate',
  'impersonation',
  'other',
] as const;

export type ContentReportReason = (typeof CONTENT_REPORT_REASONS)[number];

export type ContentReportTargetType = 'user' | 'capsule' | 'collection';

export const CONTENT_REPORT_REASON_LABELS: Record<ContentReportReason, string> = {
  spam: 'Spam o engaño',
  harassment: 'Acoso o intimidación',
  hate: 'Odio o discriminación',
  inappropriate: 'Contenido inapropiado',
  impersonation: 'Suplantación de identidad',
  other: 'Otro',
};

export function reportContentButtonLabel(options: {
  reported?: boolean;
  reporting?: boolean;
}): string {
  if (options.reporting) return 'Enviando…';
  if (options.reported) return 'Reportado';
  return 'Reportar';
}

export function isContentReportReason(value: unknown): value is ContentReportReason {
  return (
    typeof value === 'string' &&
    (CONTENT_REPORT_REASONS as readonly string[]).includes(value)
  );
}
