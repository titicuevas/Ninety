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
   - Incluye `20250802120000_collections.sql` (colecciones del diario; `position` para orden curado) y `20250810160000_collection_cover.sql` (portada / Capsule destacada)
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
npm run test:e2e:a11y      # axe WCAG 2 A/AA
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
| `a11y/` | Accesibilidad con axe-core |
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
| GET | `/api/capsules/me/export` | ✅ | Export diario JSON/CSV (GDPR) |
| POST | `/api/capsules/me/import` | ✅ | Import diario desde export JSON (omite `match_id` existentes; `restore_photos` opcional re-sube `photo_urls` remotas) |
| GET | `/api/capsules/feed` | ✅ | Feed (seguidos + tuyo); `scope`, `sort`, `photos=1`, `competition` |
| GET | `/api/capsules/user/:username` | opcional | Perfil + capsules + stats (base del cara a cara `/u/:username/vs`) |
| GET | `/api/capsules/:id` | opcional | Capsule pública (compartir) |
| POST/PATCH/DELETE | `/api/capsules`… | ✅ | CRUD capsules |
| POST/DELETE | `/api/capsules/:id/like` | ✅ | Likes |
| GET/POST/DELETE | `/api/capsules/:id/comments`… | ✅ | Comentarios |
| GET | `/api/collections/me` | ✅ | Mis colecciones |
| GET | `/api/collections/me/export` | ✅ | Export colecciones JSON (GDPR; ítems por `match_id`) |
| POST | `/api/collections/me/import` | ✅ | Import colecciones desde export JSON (omite slug existentes; enlaza Capsules por `match_id`) |
| GET | `/api/collections/me/containing/:capsuleId` | ✅ | Colecciones que ya incluyen una Capsule |
| POST/PATCH/DELETE | `/api/collections`… | ✅ | CRUD colecciones + ítems (`cover_capsule_id` en PATCH) |
| PUT | `/api/collections/:id/items/reorder` | ✅ | Reordenar Capsules (`position`) |
| GET | `/api/collections/discover` | ✅ | Descubrir listas públicas ajenas (`match_reason`: `following` / `favorite_team` / `active`) |
| GET | `/api/profile/discover` | ✅ | Sugerir aficionados (`match_reason`: equipo / ciudad / país / `active`; filtra bloqueos) |
| GET | `/api/profile/by-team` | ✅ | Fans del mismo club favorito (`?slug=` + paginación; filtra `user_blocks`) |
| GET | `/api/collections/user/:username` | opcional | Colecciones públicas |
| GET | `/api/collections/user/:username/:slug` | opcional | Detalle colección (`/u/:username/lists/:slug`) |
| GET | `/api/football/matches/search` | ✅ | Buscar partidos |
| GET | `/api/football/competitions` | ✅ | Competiciones |
| GET/PATCH | `/api/notifications/preferences` | ✅ | Preferencias por tipo + push aniversario/hito opt-in + horario silencioso (`push_quiet`) |
| GET/POST/DELETE | `/api/notifications/muted`… | ✅ | Silenciar / reactivar usuario (alertas in-app + push) |
| GET/POST/DELETE | `/api/profile/blocked`… | ✅ | Bloquear / desbloquear usuario (ocultar perfil + Capsules) |
| GET | `/api/notifications` | ✅ | Lista de alertas (`actor.followed_by_me` para seguir de vuelta) |
| POST | `/api/internal/cron/push-digest` | cron | Digest push periódico (`CRON_SECRET`; agrupa likes/comentarios/follows) |
| POST | `/api/internal/cron/push-diary` | cron | Push opt-in aniversarios/hitos (`CRON_SECRET`; `diary_push_sent` idempotente) |

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

### 🚧 v10 — Confianza & crecimiento
- [x] Reportar usuario / Capsule — denunciar abuso; complementa bloquear (migración `20250814120000_content_reports.sql` + `POST/GET /api/reports` + UI en perfil/cápsula pública; cola admin-ready vía service role, sin panel admin)
- [x] Enlace de invitación — compartir Ninety con deep link/código que atribuya o lleve a registro (`/invite/:username` + `?ref=`; migración `20250815120000_invite_attributions.sql`; `GET/POST /api/invites`; UI Perfil/Ajustes)
- [x] Lista «Quiero ir» — partidos futuros/interesantes tipo watchlist Letterboxd (`/want-to-go` + `GET/POST/DELETE /api/want-to-go`; migración `20250816120000_want_to_go_matches.sql`; CTA en búsqueda/partido manual; subnav Listas + Perfil)
- [x] Calendario del diario — vista mes de Capsules por fecha (`/diary/calendar` + `GET /api/capsules/me/calendar` por `watched_at`; acceso desde Mis Capsules / Perfil)
- [x] Push de aniversarios / hitos — opt-in en Ajustes (`push_anniversary` / `push_milestone`); cron `POST /api/internal/cron/push-diary` (+ intervalo 1h en prod); idempotencia `diary_push_sent`; migración `20250817120000_diary_push.sql`; cards on-device siguen independientes
- [x] Página de equipo — fans del mismo club favorito (descubrimiento por equipo) (`/teams/:slug` + `GET /api/profile/by-team`; club favorito clickable en perfil/búsqueda; filtra bloqueos)
- [ ] Digest email semanal — resumen opt-in del diario (Resend); dejar para el cierre de v10

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
