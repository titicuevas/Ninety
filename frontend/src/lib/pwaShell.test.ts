import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../public');

describe('PWA shell', () => {
  it('manifest tiene name, start_url y display standalone', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')) as {
      name: string;
      start_url: string;
      display: string;
    };
    assert.match(manifest.name, /Ninety/);
    assert.equal(manifest.start_url, '/home');
    assert.equal(manifest.display, 'standalone');
  });

  it('service worker precachea offline shell', () => {
    const sw = readFileSync(join(root, 'sw.js'), 'utf8');
    assert.match(sw, /ninety-v3/);
    assert.match(sw, /offline\.html/);
  });
});
