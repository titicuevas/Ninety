import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../public');
const servePath = join(dirname(fileURLToPath(import.meta.url)), '../../serve.mjs');

describe('PWA shell', () => {
  it('manifest tiene name, start_url y display standalone', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')) as {
      name: string;
      start_url: string;
      display: string;
      orientation?: string;
      icons: Array<{ src: string; sizes?: string; type?: string; purpose?: string }>;
    };
    assert.match(manifest.name, /Ninety/);
    assert.equal(manifest.start_url, '/home');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.orientation, undefined, 'la PWA debe poder rotar en móviles y tablets');

    const pngAny = manifest.icons.filter(
      (i) => i.type === 'image/png' && (i.purpose === 'any' || !i.purpose),
    );
    assert.ok(pngAny.some((i) => i.src === '/icon-192.png' && i.sizes === '192x192'));
    assert.ok(pngAny.some((i) => i.src === '/icon-512.png' && i.sizes === '512x512'));

    const maskable = manifest.icons.filter((i) => i.purpose === 'maskable');
    assert.ok(maskable.some((i) => i.src.includes('maskable') && i.sizes === '192x192'));
    assert.ok(maskable.some((i) => i.src.includes('maskable') && i.sizes === '512x512'));
  });

  it('existen PNG de instalación (192/512 + apple-touch)', () => {
    for (const name of [
      'icon-192.png',
      'icon-512.png',
      'icon-192-maskable.png',
      'icon-512-maskable.png',
      'apple-touch-icon.png',
    ]) {
      const path = join(root, name);
      assert.ok(existsSync(path), `falta ${name}`);
      assert.ok(statSync(path).size > 500, `${name} demasiado pequeño`);
      const buf = readFileSync(path);
      assert.equal(buf[0], 0x89);
      assert.equal(buf[1], 0x50); // P
      assert.equal(buf[2], 0x4e); // N
      assert.equal(buf[3], 0x47); // G
    }
  });

  it('service worker precachea offline shell e iconos', () => {
    const sw = readFileSync(join(root, 'sw.js'), 'utf8');
    assert.match(sw, /ninety-v5/);
    assert.match(sw, /offline\.html/);
    assert.match(sw, /icon-192\.png/);
  });

  it('serve.mjs cubre OG de colecciones, cara a cara y mes del diario', () => {
    const serve = readFileSync(servePath, 'utf8');
    assert.match(serve, /async function ogForCollection/);
    assert.match(serve, /async function ogForCompare/);
    assert.match(serve, /async function ogForDiaryMonth/);
    assert.match(serve, /\/api\/collections\/user\//);
    assert.match(serve, /\/calendar\?year=/);
    assert.match(serve, /Cara a cara con/);
    assert.ok(serve.includes('/lists/'));
    assert.ok(serve.includes('/vs$/i') || serve.includes('\\/vs$/i'));
    assert.ok(serve.includes('/calendar/'));
    assert.match(serve, /cover_url/);
  });
});
