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
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;
      border-radius: 0.75rem;
      background: #10b981;
      color: #052e1f;
      font-weight: 700;
      margin-bottom: 1rem;
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
    <div class="logo">90</div>
    <h1>Ninety API</h1>
    <p>Backend del diario futbolero. La app vive en el frontend.</p>
    <a href="${appUrl}">Ir a Ninety</a>
    <a class="secondary" href="/api/health">Health check</a>
    <p style="margin-top: 1.5rem;"><code>GET /api/health</code></p>
  </main>
</body>
</html>`);
});
