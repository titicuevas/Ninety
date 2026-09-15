#!/usr/bin/env node
/**
 * Comprueba que las URLs públicas del sitemap y los enlaces internos
 * principales responden 2xx/3xx (sin seguir fuera de getninety.app).
 *
 * Uso: node scripts/check-public-links.mjs
 * Env: E2E_SITE_URL / E2E_BASE_URL (default https://www.getninety.app)
 */
const BASE = (process.env.E2E_SITE_URL || process.env.E2E_BASE_URL || 'https://www.getninety.app').replace(
  /\/$/,
  '',
);

const EXTRA_PATHS = ['/login', '/register', '/aviso-legal', '/privacidad', '/terminos', '/search'];

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'ninety-link-check/1.0' },
  });
  const text = await res.text();
  return { status: res.status, url: res.url, text };
}

function extractInternalHrefs(html, pageUrl) {
  const hrefs = new Set();
  const re = /href=["']([^"'#]+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    let href = m[1].trim();
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      continue;
    }
    try {
      const abs = new URL(href, pageUrl);
      if (abs.origin !== new URL(BASE).origin) continue;
      abs.hash = '';
      hrefs.add(abs.href);
    } catch {
      /* ignore */
    }
  }
  return [...hrefs];
}

async function main() {
  const failures = [];
  const seen = new Set();

  const sitemapUrl = `${BASE}/sitemap.xml`;
  const sitemap = await fetchText(sitemapUrl);
  if (sitemap.status >= 400) {
    failures.push(`sitemap ${sitemapUrl} → ${sitemap.status}`);
  }

  const locs = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1].trim());
  const seed = new Set([...locs, ...EXTRA_PATHS.map((p) => `${BASE}${p}`)]);

  for (const page of seed) {
    if (seen.has(page)) continue;
    seen.add(page);
    let doc;
    try {
      doc = await fetchText(page);
    } catch (err) {
      failures.push(`${page} → ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    if (doc.status >= 400) {
      failures.push(`${page} → HTTP ${doc.status}`);
      continue;
    }
    for (const href of extractInternalHrefs(doc.text, doc.url || page)) {
      if (seen.has(href)) continue;
      seen.add(href);
      try {
        const r = await fetch(href, {
          method: 'GET',
          redirect: 'follow',
          headers: { 'User-Agent': 'ninety-link-check/1.0' },
        });
        if (r.status >= 400) failures.push(`${href} (desde ${page}) → HTTP ${r.status}`);
      } catch (err) {
        failures.push(`${href} → ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  if (failures.length) {
    console.error(`Enlaces rotos (${failures.length}):\n${failures.map((f) => ` - ${f}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`OK: ${seen.size} URLs comprobadas en ${BASE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
