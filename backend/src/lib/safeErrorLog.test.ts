import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { safeErrorLog, sanitizeLogText } from './safeErrorLog.js';

describe('safeErrorLog', () => {
  it('redacta credenciales habituales dentro de mensajes', () => {
    const secretAssignment = `${['SUPABASE', 'SECRET', 'KEY'].join('_')}=valor-privado`;
    const supabaseSecret = `${'sb_'}${'secret_'}abcdefghijklmnop`;
    const text = sanitizeLogText(
      `Bearer token-privado ${secretAssignment} ${supabaseSecret}`,
    );
    assert.doesNotMatch(text, /token-privado|valor-privado|sb_secret_/);
    assert.match(text, /REDACTED/);
  });

  it('conserva diagnóstico mínimo sin stack, headers ni body', () => {
    const error = Object.assign(new Error('Fallo controlado'), {
      code: 'PGRST204',
      status: 400,
      headers: { authorization: 'Bearer privado' },
      body: { password: 'privada' },
    });
    const safe = safeErrorLog(error);
    assert.deepEqual(safe, {
      name: 'Error',
      message: 'Fallo controlado',
      code: 'PGRST204',
      status: 400,
    });
    assert.doesNotMatch(JSON.stringify(safe), /authorization|password|privada|stack/i);
  });
});
