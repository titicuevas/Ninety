import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT || 4173);
const API_URL = (process.env.API_URL || process.env.VITE_API_URL || 'https://ninety-api.up.railway.app').replace(
  /\/$/,
  '',
);
const SITE_URL = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://ninety.up.railway.app').replace(
  /\/$/,
  '',
);

const BOT_UA =
  /bot|crawl|slurp|spider|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|telegrambot|whatsapp|discordbot|skypeuripreview|applebot|embedly|redditbot|pinterest|vkshare|quora link preview|outbrain|semrushbot|ia_archiver|bingpreview|google-inspectiontool/i;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function defaultImage() {
  return `${SITE_URL}/og-default.png`;
}

function renderOgHtml({ title, description, url, image, type = 'website' }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeUrl = escapeHtml(url);
  const safeImage = escapeHtml(image || defaultImage());
  const safeType = escapeHtml(type);

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />
    <link rel="canonical" href="${safeUrl}" />
    <meta property="og:site_name" content="Ninety" />
    <meta property="og:type" content="${safeType}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:locale" content="es_ES" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${safeImage}" />
    <meta http-equiv="refresh" content="0;url=${safeUrl}" />
  </head>
  <body>
    <p><a href="${safeUrl}">${safeTitle}</a></p>
    <p>${safeDescription}</p>
  </body>
</html>`;
}

async function fetchJson(pathname) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(`${API_URL}${pathname}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function ogForCapsule(id) {
  const data = await fetchJson(`/api/capsules/${encodeURIComponent(id)}`);
  if (!data) return null;

  const home = data.home_team_name ?? 'Local';
  const away = data.away_team_name ?? 'Visitante';
  const score =
    data.home_score != null && data.away_score != null
      ? ` ${data.home_score}–${data.away_score}`
      : '';
  const author =
    data.profiles?.display_name ||
    (data.profiles?.username ? `@${data.profiles.username}` : null);
  const competition = data.competition_name ? ` · ${data.competition_name}` : '';
  const note = typeof data.note === 'string' && data.note.trim() ? data.note.trim() : null;

  const title = `${home} vs ${away}${score} | Ninety`;
  const description = [author ? `Capsule de ${author}` : 'Capsule en Ninety', competition.replace(/^ · /, ''), note]
    .filter(Boolean)
    .join(' — ')
    .slice(0, 180);

  const photos = Array.isArray(data.photo_urls) ? data.photo_urls : [];
  const image = photos[0] || data.photo_url || defaultImage();

  return renderOgHtml({
    title,
    description: description || 'Un recuerdo futbolero en Ninety.',
    url: `${SITE_URL}/c/${encodeURIComponent(id)}`,
    image,
    type: 'article',
  });
}

async function ogForProfile(username) {
  const data = await fetchJson(`/api/capsules/user/${encodeURIComponent(username)}`);
  if (!data?.profile) return null;

  const profile = data.profile;
  const name = profile.display_name || profile.username || username;
  const count = Array.isArray(data.capsules) ? data.capsules.length : 0;
  const team = profile.favorite_team ? ` · ${profile.favorite_team}` : '';
  const title = `${name} (@${profile.username || username}) | Ninety`;
  const description = `${count === 1 ? '1 partido' : `${count} partidos`} en su diario futbolero${team}.`.slice(
    0,
    180,
  );

  return renderOgHtml({
    title,
    description,
    url: `${SITE_URL}/u/${encodeURIComponent(username)}`,
    image: profile.avatar_url || defaultImage(),
    type: 'profile',
  });
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(root, normalized);
  if (!full.startsWith(root)) return null;
  return full;
}

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }
    send(res, 200, data, {
      'Content-Type': contentType(filePath),
      'Cache-Control': filePath.endsWith('index.html')
        ? 'no-cache'
        : 'public, max-age=31536000, immutable',
    });
  });
}

function serveSpa(res) {
  serveFile(res, path.join(DIST, 'index.html'));
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method Not Allowed', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const ua = req.headers['user-agent'] || '';
  const isBot = BOT_UA.test(ua);

  if (isBot) {
    const capsuleMatch = pathname.match(/^\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
    if (capsuleMatch) {
      const html = await ogForCapsule(capsuleMatch[1]);
      if (html) {
        send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' });
        return;
      }
    }

    const profileMatch = pathname.match(/^\/u\/([a-z0-9_]+)$/i);
    if (profileMatch) {
      const html = await ogForProfile(profileMatch[1]);
      if (html) {
        send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' });
        return;
      }
    }
  }

  if (pathname === '/' || pathname === '') {
    serveSpa(res);
    return;
  }

  const filePath = safeJoin(DIST, pathname);
  if (!filePath) {
    send(res, 400, 'Bad request', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      serveFile(res, filePath);
      return;
    }
    // SPA fallback
    serveSpa(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Ninety frontend listening on :${PORT} (API ${API_URL})`);
});
