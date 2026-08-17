<p align="center">
  <img src="https://raw.githubusercontent.com/titicuevas/Ninety/main/frontend/public/favicon.svg" alt="Ninety" width="64" height="64" />
</p>

<h1 align="center">Ninety</h1>

<p align="center">
  <strong>Tu diario futbolero.</strong><br/>
  Guarda y revive todos los partidos que has visto a lo largo de tu vida.
</p>

<p align="center">
  <a href="https://getninety.app" target="_blank">🌐 getninety.app</a> •
  <a href="https://ninety.up.railway.app" target="_blank">Demo Railway</a> •
  <a href="https://ninety-api.up.railway.app/api/health" target="_blank">API</a> •
  <a href="#concepto">Concepto</a> •
  <a href="#stack">Stack</a> •
  <a href="#inicio-rapido">Inicio rápido</a> •
  <a href="#roadmap">Roadmap</a>
</p>

---

<a id="concepto"></a>
## ⚽ Concepto

**Ninety** no es otra app de resultados como Sofascore o Flashscore. Es el lugar donde cada aficionado construye su propia historia futbolera.

Inspirada en **Letterboxd**, **Strava** y **Spotify Wrapped**, pero aplicada al fútbol.

Cada usuario puede:

- Registrar los partidos que ha visto
- Guardar recuerdos, valoraciones, fotos y comentarios
- Generar estadísticas personales
- Compartir su historia con amigos

> *"Dentro de diez años, revivir exactamente cómo viviste cada partido importante de tu vida."*

## 🏗 Arquitectura

```
Frontend (React + Vite)  →  Backend (Express)  →  Supabase  →  Football API
```

El proyecto está separado en dos carpetas independientes que conviven en el mismo repositorio:

| Carpeta     | Descripción                          | Puerto |
|-------------|--------------------------------------|--------|
| `frontend/` | React + TypeScript + Vite + Tailwind | 5173   |
| `backend/`  | Node.js + Express + TypeScript       | 3001   |

<a id="stack"></a>
## 🛠 Stack

### Frontend
- React 19 + TypeScript + Vite
- TailwindCSS 4 + shadcn/ui + Radix UI
- React Router 7
- TanStack Query
- Zustand
- React Hook Form + Zod
- Framer Motion + Lucide React

### Backend
- Node.js + Express 5
- TypeScript + Zod
- Supabase JS (publishable + Admin/service role)

### Infraestructura
- **Supabase** — PostgreSQL, Auth, Storage, Realtime, RLS
- **football-data.org** — Datos de partidos, equipos y competiciones

<a id="inicio-rapido"></a>
## 🚀 Inicio rápido

### Requisitos

- Node.js 20+
- Cuenta en [Supabase](https://supabase.com)
- API key de [football-data.org](https://www.football-data.org/)

### 1. Clonar el repositorio

```bash
git clone https://github.com/titicuevas/Ninety.git
cd Ninety
```

### 2. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard)
2. Ejecuta la migración SQL en `supabase/migrations/20250702000000_initial_profiles.sql`
3. Activa **Google OAuth** en Authentication → Providers (opcional)
4. Copia las credenciales del proyecto
5. Ejecuta las migraciones de `supabase/migrations/` en el **SQL Editor** (en orden por fecha)
   - Incluye `20250724140000_capsule_photos_limit_9.sql` (límite de fotos 6 → 9)
   - Incluye `20250802120000_collections.sql` (colecciones del diario; `position` para orden curado), `20250810160000_collection_cover.sql` (portada / Capsule destacada) y `20250821120000_collection_likes.sql` (me gusta en listas públicas)
6. Verifica con `npm run verify:capsules --prefix backend`

### 3. Variables de entorno

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Rellena las variables con tus credenciales de Supabase y football-data.org.

### 4. Instalar y ejecutar

```bash
# Instalar dependencias
npm install
npm install --prefix backend
npm install --prefix frontend

# Ejecutar frontend + backend en paralelo
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/api/health

## 🌍 Producción (Railway)

| Servicio | URL | Estado |
|----------|-----|--------|
| **Frontend (canónico cutover)** | [www.getninety.app](https://www.getninety.app) | CNAME → Railway (arreglar Target Port si 502) |
| **Frontend (apex)** | [getninety.app](https://getninety.app) | Solo si hay ALIAS/A de Railway (Namecheap: quitar URL Redirect) |
| **Frontend (legacy)** | [ninety.up.railway.app](https://ninety.up.railway.app) | Mantener durante transición |
| **API** | [ninety-api.up.railway.app](https://ninety-api.up.railway.app) | Express |
| **Health front** | [/health](https://ninety.up.railway.app/health) | `{"status":"ok"}` |
| **Health API** | [/api/health](https://ninety-api.up.railway.app/api/health) | ✅ Online |

> Checklist ops A→E (puerto, Namecheap, vars, Supabase, email): [docs/auth-setup.md](docs/auth-setup.md#ops-ahora-orden-fijo).
> Si Railway muestra **Application failed to respond**: Target Port del dominio = `PORT` del contenedor (logs: `listening on http://0.0.0.0:N`). No uses `4173` a ciegas.
> Si preview Vite da 403: `frontend/vite.config.ts` → `preview.allowedHosts` (ya incluye www/apex).

### Variables en Railway

**Frontend** (`ninety`) — rebuild tras cambiar `VITE_*`:
```env
VITE_API_URL=https://ninety-api.up.railway.app
API_URL=https://ninety-api.up.railway.app
SITE_URL=https://www.getninety.app
VITE_SITE_URL=https://www.getninety.app
```

> `API_URL` / `SITE_URL` las usa `serve.mjs` para previews Open Graph (WhatsApp, X, Telegram) en `/c/:id`, `/u/:username`, `/u/:username/lists/:slug` y `/u/:username/vs`.
> El frontend ya no incluye el SDK de Supabase: la auth va por `/api/auth/*` en el backend.

**Backend** (`ninety-api`):
```env
NODE_ENV=production
CLIENT_URL=https://www.getninety.app
# Opcional (apex + Railway de fallback); CORS ya permite www/apex/Railway por defecto:
# CORS_ORIGINS=https://getninety.app,https://ninety.up.railway.app
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
FOOTBALL_DATA_API_KEY=tu-api-key
```

En **Supabase → Authentication → URL Configuration** (Site URL = canónico www; mantén Railway):
```
https://www.getninety.app/auth/callback
https://www.getninety.app/auth/reset-password
https://www.getninety.app/**
https://getninety.app/auth/callback
https://getninety.app/auth/reset-password
https://getninety.app/**
https://ninety.up.railway.app/auth/callback
https://ninety.up.railway.app/auth/reset-password
https://ninety.up.railway.app/**
```

Guía completa de auth + dominio: [docs/auth-setup.md](docs/auth-setup.md)

## 🧪 Probar v1 con la cuenta demo

Cuenta de prueba (seed en Supabase):

| Campo | Valor |
|-------|-------|
| Email | `demo@ninety.app` |
| Username | `@aficionado_demo` |
| Perfil público | [/u/aficionado_demo](https://getninety.app/u/aficionado_demo) (o [Railway](https://ninety.up.railway.app/u/aficionado_demo)) |

### 1. Credenciales locales

En `backend/.env` (no subir a Git):

```env
TEST_USER_EMAIL=demo@ninety.app
TEST_USER_PASSWORD=tu-contraseña-demo
```

### 2. Sembrar partidos de ejemplo

Con la API en marcha (`npm run dev`):

```bash
npm run seed:demo
```

Crea 5 capsules con fotos de prueba para el usuario demo.

### 2b. Aficionados de prueba (descubrir / seguir)

Sin necesidad de tener la API en marcha:

```bash
npm run seed:fans
```

Crea **24 usuarios** (`fan01@ninety.app` … `fan24@ninety.app`) con perfil, **avatar del escudo de su equipo**, 1–4 partidos públicos y red de follows (incluye enlaces con `@aficionado_demo` si ya existe). Comparten la contraseña de `DEMO_FANS_PASSWORD` o, si no está definida, `TEST_USER_PASSWORD` en `backend/.env`.

### 3. Tests automatizados (pirámide QE)

```bash
# Unit backend
npm test

# Unit helpers frontend (fotos)
npm test --prefix frontend

# Smoke Supabase + API
npm run smoke:v1

# Demo flow API (login, capsules, follow…)
npm run demo:flow

# —— Playwright E2E ——
# Requiere: npx playwright install chromium
# Auth: TEST_USER_PASSWORD en backend/.env

npm run test:e2e:public    # smoke público + a11y (sin login; CI)
npm run test:e2e:smoke     # smoke público + home/feed autenticados
npm run test:e2e:critical  # búsqueda, follow lists, nav móvil
npm run test:e2e:a11y      # axe público + autenticado (auth: TEST_USER_PASSWORD)
npm run test:e2e:mobile    # Pixel 5
npm run test:e2e           # suite completa
npm run test:e2e:ui        # modo UI Playwright

# Combo rápido QE local
npm run test:qa
```

Estructura `e2e/`:

| Carpeta | Qué cubre |
|---------|-----------|
| `smoke/` | Salud mínima (landing, login form, API health, home) |
| `critical/` | Flujos de negocio (buscar aficionados, listas, capsule pública, nav móvil) |
| `a11y/` | Accesibilidad con axe-core (público + autenticado) |
| `helpers/` | Login, token, asserts a11y |

Tags: `@smoke` · `@critical` · `@a11y` · `@mobile`

### 4. Checklist manual responsive

Probar en **móvil** (375px), **tablet** (768px) y **desktop** (1280px):

| Ruta | Qué verificar |
|------|----------------|
| `/` | Landing, preview Wrapped, CTAs apilados en móvil |
| `/login` | Formulario centrado, inputs táctiles |
| `/home` | Wrapped en grid, banner perfil en columna en móvil |
| `/feed` | Cards a ancho completo, likes/comentarios sin overflow |
| `/activity` | Timeline de follows (Capsules + listas); filtros `?type=`; empty states y scroll infinito |
| `/search` | Grid 1 col móvil → 2 cols tablet+ |
| `/capsules/new` | Formulario `max-w-md` → `lg:max-w-xl` |
| `/profile` | Avatar y formulario legibles |
| `/u/aficionado_demo` | Perfil público sin login, botón Seguir |
| `/u/aficionado_demo/followers` | Lista pública de seguidores |
| `/u/aficionado_demo/following` | Lista pública de seguidos |
| `/c/:id` | Capsule pública, compartir, comentarios en lectura |

Nav: **tab bar inferior** en móvil y tablet (&lt;1024px); nav en header desde `lg`. Safe areas (notch / home indicator) en iOS.

## 🩺 React Doctor

Auditoría automática de calidad React (performance, accesibilidad, seguridad, mantenibilidad).

```bash
# Requiere Node >= 20.19
nvm use
npm run doctor              # escanear frontend
npm run doctor:install      # instalar skill para Cursor + CI
```

| Comando | Descripción |
|---------|-------------|
| `npm run doctor` | Escaneo completo con detalle |
| `npm run doctor:install` | Skill para Cursor + workflow GitHub Actions |

- Skill del agente: `.agents/skills/react-doctor/`
- CI en PRs: `.github/workflows/react-doctor.yml`
- Documentación: [react.doctor](https://react.doctor)

**Reglas que seguimos:** LazyMotion + `useReducedMotion`, botones con `type` explícito, componentes React 19 sin `forwardRef`, Storage preparado vía `useCapsuleStorage`.

## 🛡 Secretos y CI

Evitar filtrar claves (Supabase secret, VAPID, tokens) en el repo:

| Capa | Qué |
|------|-----|
| Local | `npm run check:secrets` — patrones propios (Supabase secret, VAPID, passwords de demo) |
| CI | [TruffleHog OSS](https://github.com/marketplace/actions/trufflehog-oss) en push/PR a `main` |

- Workflow: `.github/workflows/trufflehog.yml`
- Escanea el rango del push/PR y **falla** si encuentra secretos **verificados** (`--results=verified`)
- Los secretos reales viven solo en `.env` (gitignored) y en variables de Railway/Supabase

```bash
npm run check:secrets
```

## 📂 Estructura del proyecto

```
Ninety/
├── frontend/                 # App React
│   ├── src/
│   │   ├── components/       # UI reutilizable
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Supabase, API client
│   │   ├── pages/            # Páginas/rutas
│   │   ├── routes/           # Configuración de rutas
│   │   ├── stores/           # Zustand stores
│   │   └── types/            # Tipos TypeScript
│   └── ...
├── backend/                  # API Express
│   ├── src/
│   │   ├── config/           # Variables de entorno
│   │   ├── lib/              # Clientes (Supabase)
│   │   ├── middleware/       # Auth, errores
│   │   └── routes/           # Endpoints REST
│   └── ...
├── supabase/
│   └── migrations/           # Esquema SQL
└── README.md
```

## 🔐 API Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/login` | — | Login email/contraseña |
| POST | `/api/auth/register` | — | Registro |
| POST | `/api/auth/refresh` | — | Renovar sesión con refresh_token |
| POST | `/api/auth/oauth/google` | — | Iniciar OAuth Google |
| POST | `/api/auth/oauth/exchange` | — | Intercambio PKCE OAuth |
| POST | `/api/auth/delete-account` | ✅ | Borrado self-serve (confirma `confirm_email`; irreversible) |
| GET | `/api/profile/me` | ✅ | Perfil propio |
| PATCH | `/api/profile/me` | ✅ | Actualizar perfil |
| GET | `/api/profile/:username` | — | Perfil público (metadatos) |
| GET | `/api/profile/:username/followers` | opcional | Lista de seguidores (`followed_by_me`, `follows_me`) |
| GET | `/api/profile/:username/following` | opcional | Lista de seguidos (`followed_by_me`, `follows_me`) |
| GET | `/api/profile/search` | ✅ | Buscar aficionados (`?q=`; anota `followed_by_me` + `follows_me`) |
| POST/DELETE | `/api/profile/:username/follow` | ✅ | Seguir / dejar de seguir |
| GET | `/api/capsules/me` | ✅ | Mis capsules |
| GET | `/api/capsules/me/liked` | ✅ | Capsules a las que di me gusta (públicas + propias; filtra blocks) |
| GET | `/api/capsules/me/:matchId/following` | ✅ | Follows con Capsule pública del mismo partido (`is_public` + blocks) |
| GET | `/api/capsules/me/export` | ✅ | Export diario JSON/CSV (GDPR) |
| POST | `/api/capsules/me/import` | ✅ | Import diario desde export JSON (omite `match_id` existentes; `restore_photos` opcional re-sube `photo_urls` remotas) |
| GET | `/api/capsules/feed` | ✅ | Feed (seguidos + tuyo); `scope`, `sort`, `photos=1`, `competition` |
| GET | `/api/activity` | ✅ | Timeline de actividad de follows (Capsules + colecciones públicas nuevas + me gusta; `type=capsule|collection`; blocks; `limit`/`offset`) |
| GET | `/api/capsules/user/:username` | opcional | Perfil + capsules + stats (base del cara a cara `/u/:username/vs`) |
| GET | `/api/capsules/:id` | opcional | Capsule pública (compartir) |
| POST/PATCH/DELETE | `/api/capsules`… | ✅ | CRUD capsules |
| POST/DELETE | `/api/capsules/:id/like` | ✅ | Likes |
| GET | `/api/capsules/:id/likes/following` | ✅ | Follows que dieron me gusta a esta Capsule |
| GET/POST/DELETE | `/api/capsules/:id/comments`… | ✅ | Comentarios |
| GET | `/api/collections/me` | ✅ | Mis colecciones |
| GET | `/api/collections/me/liked` | ✅ | Listas a las que di me gusta (públicas + propias; filtra blocks) |
| GET | `/api/collections/me/export` | ✅ | Export colecciones JSON (GDPR; ítems por `match_id`) |
| POST | `/api/collections/me/import` | ✅ | Import colecciones desde export JSON (omite slug existentes; enlaza Capsules por `match_id`) |
| GET | `/api/collections/me/containing/:capsuleId` | ✅ | Colecciones que ya incluyen una Capsule |
| POST/PATCH/DELETE | `/api/collections`… | ✅ | CRUD colecciones + ítems (`cover_capsule_id` en PATCH) |
| PUT | `/api/collections/:id/items/reorder` | ✅ | Reordenar Capsules (`position`) |
| GET | `/api/collections/discover` | ✅ | Descubrir listas públicas ajenas (`q`, `sort=relevant|recent|likes`; `match_reason`: `following` / `favorite_team` / `active`) |
| GET | `/api/profile/discover` | ✅ | Sugerir aficionados (`match_reason`: equipo / ciudad / país / `active`; filtra bloqueos) |
| GET | `/api/profile/by-team` | ✅ | Fans del mismo club favorito (`?slug=` + paginación; filtra `user_blocks`) |
| GET | `/api/collections/user/:username` | opcional | Colecciones públicas |
| GET | `/api/collections/user/:username/:slug` | opcional | Detalle colección (`/u/:username/lists/:slug`) |
| POST/DELETE | `/api/collections/:id/like` | ✅ | Me gusta en colección (pública o propia; respeta blocks) |
| GET | `/api/collections/:id/likes` | opcional | Quién dio me gusta |
| GET | `/api/collections/:id/likes/following` | ✅ | Follows que dieron me gusta a esta lista |
| GET | `/api/football/matches/search` | ✅ | Buscar partidos |
| GET | `/api/football/competitions` | ✅ | Competiciones |
| GET/PATCH | `/api/notifications/preferences` | ✅ | Preferencias por tipo + push aniversario/hito/Quiero ir opt-in + digest email opt-in + horario silencioso (`push_quiet`) |
| GET/POST/DELETE | `/api/notifications/muted`… | ✅ | Silenciar / reactivar usuario (alertas in-app + push) |
| GET/POST/DELETE | `/api/profile/blocked`… | ✅ | Bloquear / desbloquear usuario (ocultar perfil + Capsules) |
| POST/GET | `/api/reports`… | ✅ | Reportar usuario, Capsule o colección pública (`target_type`; cola admin-ready) |
| DELETE | `/api/want-to-go/played` | ✅ | Quitar de Quiero ir los ya jugados sin Capsule |
| GET | `/api/notifications` | ✅ | Lista de alertas (`actor.followed_by_me` para seguir de vuelta) |
| POST | `/api/internal/cron/push-digest` | cron | Digest push periódico (`CRON_SECRET`; agrupa likes/comentarios/follows) |
| POST | `/api/internal/cron/push-diary` | cron | Push opt-in aniversarios/hitos + recordatorio Quiero ir (`CRON_SECRET`; `diary_push_sent` idempotente) |
| POST | `/api/internal/cron/email-digest` | cron | Digest email semanal del diario (`CRON_SECRET` + Resend; opt-in; lunes en TZ; `diary_email_digest_sent`) |
| GET/POST | `/api/email-digest/unsubscribe` | público | Baja one-click del digest email (firma HMAC) |

<a id="roadmap"></a>
## 📅 Roadmap

### ✅ v1 — MVP (beta abierta)
- [x] Buscar partidos (ligas, copas, Champions)
- [x] Crear y editar Capsules
- [x] Mis Capsules + feed social básico
- [x] Estadísticas básicas en Home
- [x] Perfil editable
- [x] Deploy en Railway
- [x] Páginas legales (privacidad y términos)

### ✅ v1.1 — Pulido beta
- [x] Fotos en Capsules
- [x] Google OAuth
- [x] Perfiles públicos
- [x] Wrapped visual mejorado

### 🔮 v2 — Social
- [x] Likes en capsules
- [x] Comentarios en capsules
- [x] Seguir usuarios
- [x] Listas de seguidores / seguidos
- [x] Compartir (enlace público `/c/:id`)
- [x] Previews Open Graph al compartir
- [x] Wrapped anual

### ✅ v3 — Avanzado
- [x] IA (resúmenes, recomendaciones)
- [x] Gamificación (insignias, logros)
- [x] Mapa de estadios
- [x] Estadísticas avanzadas

### ✅ v4 — Diario social & portabilidad
- [x] Comparar diarios (cara a cara) — partidos, media, estadio y overlap de equipos vs otro aficionado (`/u/:username/vs`)
- [x] Colecciones del diario — listas curadas de Capsules (“Clásicos”, “Viajes”, “Noches de Champions”) compartibles al estilo Letterboxd (`/collections`, `/u/:username/lists/:slug`; migración `20250802120000_collections.sql`)
- [x] Exportar mi diario — descarga JSON/CSV desde Ajustes (backup y portabilidad GDPR; Capsules del diario, sin colecciones)
- [x] Instalar Ninety (PWA) — añadir a pantalla de inicio desde Ajustes + shell offline ligero (`manifest.json` con PNG 192/512 + maskable, `apple-touch-icon`, `sw.js`, `/offline.html`)
- [x] Previews Open Graph en colecciones públicas y cara a cara (`serve.mjs`)

### 🚧 v5 — Activación & retención
- [x] Colecciones descubribles — CTAs en Perfil / Mis Capsules / perfil público, «Añadir a colección» desde Capsule, empty states y humo e2e
- [x] Cara a cara más visual (avatares, proporciones, equipos en común vacíos)
- [x] Digest / recordatorios ligeros para volver al diario — tarjeta en Inicio (resumen semanal / nudge / hueco) + preferencia en Ajustes; on-device, sin emails
- [x] Onboarding de valor (primera colección, primer compare)
- [x] Aniversarios del diario («Tal día como hoy») — card en Inicio cuando hace ≥1 año viste un partido el mismo mes/día + preferencia en Ajustes; on-device, prioridad sobre digest, sin emails
- [x] Hitos del diario — card en Inicio al llegar a 5 / 10 / 25 / 50 / 100 / 250 Capsules + preferencia en Ajustes; on-device, tras aniversario y antes del digest, sin emails

### ✅ v6 — Diario curado & profundidad social
- [x] Reordenar Capsules en colecciones — subir/bajar sobre la columna `position` (ya en schema); el orden se refleja en la lista pública (`PUT /api/collections/:id/items/reorder`)
- [x] Portada de colección — destacar una Capsule o usar la primera foto como cover en listas públicas
- [x] Importar diario desde export JSON — complemento GDPR al backup actual (Ajustes + `POST /api/capsules/me/import`; fotos opcionales vía `restore_photos`)
- [x] Preferencias de alertas por tipo — silenciar likes / comentarios / follows (in-app + push), sin emails (`GET/PATCH /api/notifications/preferences`; migración `20250811143000_notification_preferences.sql`)
- [x] Filtros del feed — competición o «solo con fotos» sobre Siguiendo / Explorar (`photos=1`, `competition` en `/api/capsules/feed` + chips en `/feed`)
- [x] Pulido a11y en flujos clave — foco, landmarks y labels en colecciones y notificaciones

### ✅ v7 — Ritmo social & control fino
- [x] Digest de actividad social — likes / comentarios (por cápsula) y follows agrupados en el centro de alertas; avatares apilados y marcar leído por grupo
- [x] Empty states post-import — guiar al usuario tras restaurar el diario (colecciones, feed, comparar)
- [x] Filtros en el centro de alertas — ver solo likes / comentarios / follows
- [x] Silenciar usuario concreto — no recibir alertas de un actor (in-app + push), desde la fila o el perfil (`GET/POST/DELETE /api/notifications/muted`; migración `20250811170000_notification_mutes.sql`)
- [x] Horario silencioso de push — franja local (timezone del dispositivo) sin push; in-app sí (`push_quiet` en `GET/PATCH /api/notifications/preferences`; migración `20250811180000_notification_push_quiet_hours.sql`)
- [x] Seguir de vuelta desde un follow — acción rápida en la fila del digest (`followed_by_me` en actores de `GET /api/notifications` + CTA en follows de un solo actor)

### ✅ v8 — Reciprocidad social & portabilidad profunda
- [x] Badge «Te sigue» + seguir de vuelta fuera del digest — `follows_me` en perfil, listas, búsqueda, me gusta y Capsule pública; CTA «Seguir de vuelta» cuando aún no hay follow mutuo
- [x] Exportar / importar colecciones — incluir listas curadas en el backup GDPR (Ajustes + `GET/POST /api/collections/me/export|import`; ítems por `match_id`)
- [x] Digest de push — agrupar likes/comentarios/follows en un push periódico en lugar de uno por evento (`push_sent_at` + `flushPushDigests`; cron `POST /api/internal/cron/push-digest` o intervalo 15 min en prod)
- [x] Restaurar fotos al importar el diario — re-subida opcional de `photo_urls` del export (`restore_photos` en Ajustes + `POST /api/capsules/me/import`; solo URLs http/https accesibles, máx. 9/Capsule y 200/import)
- [x] Explorar colecciones ajenas — descubrimiento de listas públicas más allá del perfil (`GET /api/collections/discover` + `/collections/explore`)
- [x] Borrado de cuenta self-serve — eliminar cuenta desde Ajustes (`POST /api/auth/delete-account`; confirma email; cascade + limpieza Storage)

### ✅ v9 — Captura libre & cierre de loops
- [x] Partido manual — guardar Capsules fuera del catálogo football-data (amistosos, locales, torneos no indexados) con `match_id` negativo estable (`/search/manual` + CTAs en búsqueda)
- [x] Deep links en push digest — like/comentario abren `/c/:id` (o `#comments`); follow único al perfil; resumen multi → `/notifications`
- [x] Colecciones en la navegación principal — acceso a Mis listas / Explorar desde el shell (`Listas` en nav + subnav Mis listas / Explorar)
- [x] Legales alineados con borrado self-serve — Privacidad y Términos ya no piden email manual tras `POST /api/auth/delete-account`
- [x] Bloquear usuario — dejar de ver Capsules/perfil de alguien (más allá del mute de alertas) (`GET/POST/DELETE /api/profile/blocked`; migración `20250813100000_user_blocks.sql`; feed/discover/cápsula pública filtran bloqueos bidireccionales)
- [x] Discovery en frío — perfiles/colecciones útiles sin follows ni equipo favorito (`match_reason: active` en discover; empty states del feed/Inicio enlazan a `/collections/explore`)

### ✅ v10 — Confianza & crecimiento
- [x] Reportar usuario / Capsule — denunciar abuso; complementa bloquear (migración `20250814120000_content_reports.sql` + `POST/GET /api/reports` + UI en perfil/cápsula pública; cola admin-ready vía service role, sin panel admin; colecciones en v16)
- [x] Enlace de invitación — compartir Ninety con deep link/código que atribuya o lleve a registro (`/invite/:username` + `?ref=`; migración `20250815120000_invite_attributions.sql`; `GET/POST /api/invites`; UI Perfil/Ajustes)
- [x] Lista «Quiero ir» — partidos futuros/interesantes tipo watchlist Letterboxd (`/want-to-go` + `GET/POST/DELETE /api/want-to-go`; migración `20250816120000_want_to_go_matches.sql`; CTA en búsqueda/partido manual; subnav Listas + Perfil)
- [x] Calendario del diario — vista mes de Capsules por fecha (`/diary/calendar` + `GET /api/capsules/me/calendar` por `watched_at`; acceso desde Mis Capsules / Perfil)
- [x] Push de aniversarios / hitos — opt-in en Ajustes (`push_anniversary` / `push_milestone`); cron `POST /api/internal/cron/push-diary` (+ intervalo 1h en prod); idempotencia `diary_push_sent`; migración `20250817120000_diary_push.sql`; cards on-device siguen independientes
- [x] Página de equipo — fans del mismo club favorito (descubrimiento por equipo) (`/teams/:slug` + `GET /api/profile/by-team`; club favorito clickable en perfil/búsqueda; filtra bloqueos)
- [x] Digest email semanal — resumen opt-in del diario vía Resend (`email_digest` en Ajustes; cron `POST /api/internal/cron/email-digest`; idempotencia `diary_email_digest_sent`; migración `20250818120000_email_digest.sql`; baja one-click; no mezcla con digest push social)

### ✅ v11 — Diario con más sustancia
- [x] Recordatorio «Quiero ir» — push opt-in cuando se acerca un partido de la watchlist (ventana ~48 h; `push_want_to_go` en Ajustes; mismo cron `POST /api/internal/cron/push-diary`; idempotencia `diary_push_sent` kind `want_to_go`; deep link `/want-to-go`; migración `20250819120000_want_to_go_push.sql`; respeta quiet hours)
- [x] Notas / reseña corta en Capsule — texto libre además del rating (`note`, máx. 1000; crear/editar + detalle propio/público; sin migración nueva — columna desde `20250705120000_capsules.sql`)
- [x] Tags en Capsules — etiquetas propias (clásico, viaje, derbi…) filtrables en Mis Capsules (`tags text[]` máx. 8×24; crear/editar + filtro `?tag=` en `GET /api/capsules/me`; visibles en detalle/listado; migración `20250820120000_capsule_tags.sql`)
- [x] Me gusta en colecciones — señal social ligera en listas públicas (`POST/DELETE /api/collections/:id/like`, `GET /api/collections/:id/likes`; contador + lista; migración `20250821120000_collection_likes.sql`; respeta blocks; sin likes en privadas ajenas)
- [x] Compartir calendario / mes del diario — link shareable + preview OG (`/u/:username/calendar/:year/:month` + `GET /api/capsules/user/:username/calendar`; solo Capsules públicas; botón compartir/copiar en `/diary/calendar`)
- [x] Mentions en comentarios — @usuario notifica y enlaza al perfil (tipo `mention`; máx. 5/comentario; sin self/blocked/dueño Capsule; prefs de comentarios; migración `20250822120000_notification_mentions.sql`)

### ✅ v12 — Conversación & listas vivas
- [x] Respuestas a comentarios — hilos ligeros bajo un comentario (1 nivel); notifica al padre (`parent_id` en `capsule_comments`; `POST` con `parent_id`; UI hilo; tipo `comment` al autor del padre; migración `20250823120000_capsule_comment_replies.sql`; blocks/mutes/prefs vía `notifyUser`)
- [x] Editar / borrar comentario propio — confirmación al borrar; `edited_at` al editar; `PATCH/DELETE /api/capsules/:id/comments/:commentId`; UI en propio (incl. replies); ownership; migración `20250824120000_capsule_comments_edited_at.sql`
- [x] Comentarios en colecciones públicas — charla en la lista (además de likes); `GET/POST/PATCH/DELETE /api/collections/:id/comments`; UI en página pública; blocks; sin comentarios en privadas ajenas; migración `20250825120000_collection_comments.sql`
- [x] Quiero ir en común — ver quién de tus follows también tiene ese partido (`GET /api/want-to-go/me/:matchId/following`; UI ligera en `/want-to-go`)
- [x] Tags en diario público — filtrar Capsules públicas por tag en perfil ajeno (`?tag=` + chips; `tags` en respuesta de `GET /api/capsules/user/:username`)
- [x] Colección destacada en perfil — pin de una lista pública (`featured_collection_id` en profiles; `PATCH /api/profile/me`; visible en perfil público; migración `20250826120000_featured_collection.sql`)

### ✅ v13 — Descubrimiento & ritmo diario
- [x] Feed de actividad de follows — timeline ligera aparte del feed de Capsules (`GET /api/activity` + `/activity`; nuevas Capsules/colecciones públicas de gente que sigues; respeta blocks; paginación `limit`/`offset`)
- [x] Guardar búsqueda / filtros del diario — recordar último tag/filtro en Mis Capsules (`localStorage` `ninety.diaryFilters:v1:` + query sticky vía `useDiaryFilterParams({ persist: true })`)
- [x] Soft nudge «completa tu Capsule» — si hay rating sin nota/fotos, card discreta en Home (on-device; `ninety.incompleteCapsule:v1:`; sin backend)
- [x] Notificación de like en colección — opt-in reutilizando prefs de likes (`collection_like` + `collection_id`; migración `20250827120000_notification_collection_likes.sql`; in-app + digest push)
- [x] Estadio favorito / mapa enriquecido — destacar sede más visitada + deep link al diario (`context=stadium`) y a Capsules (`/c/:id`); pin dorado en mapa
- [x] Export Wrapped / mes como texto compartible mejorado — copy one-tap (`Copiar texto`) desde Wrapped y calendario; resumen enriquecido (`buildWrappedShareText` / `buildDiaryMonthShareText`)

### ✅ v14 — Ritmo social & descubrimiento fino
- [x] Filtros en Actividad — ver solo Capsules o solo listas (`?type=capsule|collection` en `GET /api/activity` + chips en `/activity`)
- [x] Buscar / ordenar en Explorar colecciones — `q` + `sort=relevant|recent|likes` en `GET /api/collections/discover` y UI en `/collections/explore`
- [x] Respuestas en comentarios de colecciones — hilos 1 nivel (`parent_id`; migración `20250828120000_collection_comment_replies.sql`; paridad con Capsules)
- [x] Compartir perfil como texto — resumen one-tap (`Copiar texto` / Compartir) desde perfil público y Ajustes de perfil (`buildProfileShareText`)
- [x] Soft nudge «Quiero ir» en Home — card cuando hay partidos cercanos en la watchlist (además del push; on-device `ninety.wantToGoNudge:v1:`; ventana ~48 h)

### ✅ v15 — Loops cerrados & paridad social en listas
- [x] Notificación de comentario en colección — avisar al dueño (y al padre en reply) al comentar una lista pública (`type: comment` + `collection_id`; deep link a la lista; prefs/digest de comentarios)
- [x] Mentions en comentarios de colecciones — `@usuario` notifica como en Capsules (extender `notifyCommentMentions` a `collectionId`; sin self/blocked)
- [x] Auto-quitar de Quiero ir al crear Capsule — al guardar el partido, salir de la watchlist sin paso manual (invalidar `want-to-go`)
- [x] Soft nudge «ya jugó» en Quiero ir — card en Home cuando un partido de la lista ya pasó y aún no hay Capsule (on-device; CTA a crear Capsule; ventana ~14 días; prioridad tras el nudge pre-partido)
- [x] Compartir colección como texto — resumen one-tap (`Copiar texto` / Compartir) además del enlace (`buildCollectionShareText`)

### ✅ v16 — Paridad Capsule & partidos en común
- [x] Compartir Capsule como texto — resumen one-tap (`Copiar texto` / Compartir) con equipos, rating y nota además del enlace (`buildCapsuleShareText`; paridad con perfil / colección / mes)
- [x] Reportar colección — denunciar listas abusivas; `content_report_target_type` + `collection` (migración `20250829120000_content_reports_collection.sql`) + UI en lista pública (`POST/GET /api/reports`; misma cola que usuario/Capsule)
- [x] También lo vieron — quién de tus follows tiene Capsule del mismo partido (`GET /api/capsules/me/:matchId/following`; respeta `is_public` y blocks; UI en Capsule pública; índice `capsules_public_match_id_idx`)
- [x] Mis me gusta — archivo de Capsules que te gustaron (`GET /api/capsules/me/liked` + `/likes`; índice `capsule_likes_user_created_idx`)
- [x] Quiero ir: próximos vs ya jugados — chips en `/want-to-go` (`?when=upcoming|played`) + CTA «limpiar ya jugados sin Capsule» (`DELETE /api/want-to-go/played`)

### ✅ v17 — Accesibilidad en la app autenticada
- [x] axe WCAG 2 A/AA en home, feed, Capsule, Mis listas y Quiero ir (además de landing / login / perfil público)
- [x] Modales nativos (`<dialog>`): foco al abrir, Esc y restauración al cerrar (reportar, confirmar, me gusta)
- [x] Teclado en chips e iconos de pantallas recientes + contraste de chips inactivos

### ✅ v18 — Archivo de listas con me gusta
- [x] Listas que te gustaron — archivo de colecciones (`GET /api/collections/me/liked` + `/collections/likes`; índice `collection_likes_user_created_idx`)

### ✅ v19 — También les gusta esta lista
- [x] También les gusta — quién de tus follows dio me gusta a una lista pública (`GET /api/collections/:id/likes/following`; paridad con También lo vieron / Quiero ir en común)

### ✅ v20 — También le gusta esta Capsule
- [x] También le gusta — quién de tus follows dio me gusta a una Capsule (`GET /api/capsules/:id/likes/following`; paridad con listas)

### ✅ v21 — Me gusta en Actividad
- [x] Actividad de me gusta — ver cuando alguien que sigues da me gusta a una Capsule o lista pública (`capsule_like` / `collection_like` en `GET /api/activity`)

## 🎨 Identidad visual

- **Tema:** Oscuro, minimalista, premium
- **Color principal:** Verde esmeralda (`#10b981`)
- **Tipografía:** Inter
- **Inspiración:** Letterboxd, Strava, Spotify, Notion

## 📄 Licencia

Proyecto privado — todos los derechos reservados.

---

<p align="center">
  Hecho con ⚽ por aficionados, para aficionados.
</p>
