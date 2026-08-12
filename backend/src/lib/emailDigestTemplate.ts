import type { EmailDigestContent } from './emailDigestBuild.js';

export type EmailDigestMail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absoluteUrl(clientUrl: string, path: string): string {
  const base = clientUrl.replace(/\/$/, '');
  const href = path.startsWith('/') ? path : `/${path}`;
  return `${base}${href}`;
}

/**
 * Plantilla dark + verde esmeralda (marca Ninety).
 * Enlaces: CTA principal + Ajustes + baja one-click.
 */
export function renderEmailDigestMail(
  content: EmailDigestContent,
  options: {
    clientUrl: string;
    settingsUrl: string;
    unsubscribeUrl: string;
  },
): EmailDigestMail {
  const ctaUrl = absoluteUrl(options.clientUrl, content.cta.href);
  const subject =
    content.kind === 'summary'
      ? `Ninety · ${content.weekCount} partido${content.weekCount === 1 ? '' : 's'} esta semana`
      : 'Ninety · Resumen de tu diario';

  const matchLines =
    content.matches.length > 0
      ? content.matches
          .map((m) => {
            const rating = m.rating != null ? ` · ${m.rating}/5` : '';
            return `• ${m.label}${rating}`;
          })
          .join('\n')
      : null;

  const textParts = [
    content.title,
    '',
    content.intro,
    matchLines ? `\n${matchLines}` : '',
    '',
    `${content.cta.label}: ${ctaUrl}`,
    '',
    `Preferencias: ${options.settingsUrl}`,
    `Darte de baja: ${options.unsubscribeUrl}`,
    '',
    '— Ninety',
  ].filter((line, i, arr) => !(line === '' && arr[i - 1] === ''));

  const matchHtml =
    content.matches.length > 0
      ? `<ul style="margin:16px 0 0;padding:0 0 0 18px;color:#d1d5db;font-size:14px;line-height:1.6;">${content.matches
          .map((m) => {
            const rating =
              m.rating != null
                ? ` <span style="color:#6ee7b7;">${escapeHtml(String(m.rating))}/5</span>`
                : '';
            return `<li style="margin:0 0 6px;">${escapeHtml(m.label)}${rating}</li>`;
          })
          .join('')}</ul>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;color:#e5e7eb;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#10b981;font-weight:600;">Ninety</p>
              <h1 style="margin:12px 0 0;font-size:22px;line-height:1.3;color:#f9fafb;font-weight:600;">${escapeHtml(content.title)}</h1>
              <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:#d1d5db;">${escapeHtml(content.intro)}</p>
              ${matchHtml}
              <p style="margin:28px 0 0;">
                <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#10b981;color:#052e1a;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:8px;">${escapeHtml(content.cta.label)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;">
              <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">
                Resumen opt-in de tu diario · no es un digest social.
                <br />
                <a href="${escapeHtml(options.settingsUrl)}" style="color:#6ee7b7;text-decoration:underline;">Preferencias</a>
                ·
                <a href="${escapeHtml(options.unsubscribeUrl)}" style="color:#6ee7b7;text-decoration:underline;">Darme de baja</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text: textParts.join('\n') };
}
