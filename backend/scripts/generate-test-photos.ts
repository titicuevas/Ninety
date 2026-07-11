/**
 * Genera 6 JPEG de prueba para uploads E2E / seed demo.
 * Uso: npm run generate:test-photos --prefix backend
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const photoDir = process.env.TEST_PHOTO_DIR ?? '/tmp/ninety-test-photos';

/** JPEG mínimo válido (1×1 px) como fallback sin ImageMagick. */
const MINIMAL_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAv/EABQRAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEBAD8Af//Z',
  'base64',
);

function generateWithImageMagick() {
  for (let i = 1; i <= 6; i++) {
    const out = resolve(photoDir, `photo-${i}.jpg`);
    execSync(
      `convert -size 640x480 'xc:#10b981' -fill white -gravity center -pointsize 64 -annotate 0 'F${i}' '${out}'`,
      { stdio: 'pipe' },
    );
  }
}

function generateFallback() {
  for (let i = 1; i <= 6; i++) {
    writeFileSync(resolve(photoDir, `photo-${i}.jpg`), MINIMAL_JPEG);
  }
}

function main() {
  mkdirSync(photoDir, { recursive: true });

  const allExist = [1, 2, 3, 4, 5, 6].every((n) => existsSync(resolve(photoDir, `photo-${n}.jpg`)));
  if (allExist) {
    console.log(`✅ Fotos de prueba ya existen en ${photoDir}`);
    return;
  }

  try {
    generateWithImageMagick();
    console.log(`✅ 6 fotos generadas con ImageMagick en ${photoDir}`);
  } catch {
    generateFallback();
    console.log(`✅ 6 fotos placeholder generadas en ${photoDir} (instala ImageMagick para previews con texto)`);
  }
}

main();
