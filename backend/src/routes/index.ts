import { Router } from 'express';
import { env } from '../config/loadEnv.js';

export const indexRouter = Router();

indexRouter.get('/', (_req, res) => {
  const appUrl = env.CLIENT_URL;

  res.type('html').send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ninety API</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: Inter, system-ui, sans-serif;
      background: #0a0a0b;
      color: #fafafa;
      padding: 1.5rem;
    }
    main {
      max-width: 28rem;
      text-align: center;
    }
    .logo {
      width: 3rem;
      height: 3rem;
      border-radius: 0.75rem;
      margin: 0 auto 1rem;
      display: block;
    }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #a1a1aa; line-height: 1.6; margin-bottom: 1.5rem; }
    a {
      display: inline-block;
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      background: #10b981;
      color: #052e1f;
      text-decoration: none;
      font-weight: 600;
      margin: 0.25rem;
    }
    a.secondary {
      background: #27272a;
      color: #fafafa;
    }
    code { color: #6ee7b7; font-size: 0.875rem; }
  </style>
</head>
<body>
  <main>
    <svg class="logo" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#053b2d"/>
          <stop offset="100%" stop-color="#0a0a0b"/>
        </linearGradient>
        <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#34d399"/>
          <stop offset="100%" stop-color="#10b981"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#bg)"/>
      <rect x="30" y="30" width="452" height="452" rx="82" fill="none" stroke="url(#stroke)" stroke-width="10" opacity="0.35"/>
      <path d="M156 362V150h54l92 111V150h54v212h-50l-96-117v117z" fill="url(#stroke)"/>
      <path d="M166 386h180" stroke="#10b981" stroke-width="12" stroke-linecap="round" opacity="0.45"/>
      <circle cx="380" cy="142" r="26" fill="#10b981" opacity="0.16"/>
    </svg>
    <h1>Ninety API</h1>
    <p>Backend del diario futbolero. La app vive en el frontend.</p>
    <a href="${appUrl}">Ir a Ninety</a>
    <a class="secondary" href="/api/health">Health check</a>
    <p style="margin-top: 1.5rem;"><code>GET /api/health</code></p>
  </main>
</body>
</html>`);
});
