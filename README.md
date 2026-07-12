<p align="center">
  <img src="https://raw.githubusercontent.com/titicuevas/Ninety/main/frontend/public/favicon.svg" alt="Ninety" width="64" height="64" />
</p>

<h1 align="center">Ninety</h1>

<p align="center">
  <strong>Tu diario futbolero.</strong><br/>
  Guarda y revive todos los partidos que has visto a lo largo de tu vida.
</p>

<p align="center">
  <a href="https://ninety.up.railway.app" target="_blank">🌐 Demo</a> •
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
| **Frontend** | [ninety.up.railway.app](https://ninety.up.railway.app) | App React |
| **API** | [ninety-api.up.railway.app](https://ninety-api.up.railway.app) | Express |
| **Health** | [/api/health](https://ninety-api.up.railway.app/api/health) | ✅ Online |

> Si el frontend muestra error 403, redeploy tras actualizar `frontend/vite.config.ts` (`preview.allowedHosts`).

### Variables en Railway

**Frontend** (`ninety`):
```env
VITE_API_URL=https://ninety-api.up.railway.app
```

> El frontend ya no incluye el SDK de Supabase: la auth va por `/api/auth/*` en el backend.

**Backend** (`ninety-api`):
```env
NODE_ENV=production
CLIENT_URL=https://ninety.up.railway.app
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
FOOTBALL_DATA_API_KEY=tu-api-key
```

En **Supabase → Authentication → URL Configuration** añade:
```
https://ninety.up.railway.app/auth/callback
https://ninety.up.railway.app/**
```

Guía completa de auth: [docs/auth-setup.md](docs/auth-setup.md)

## 🧪 Probar v1 con la cuenta demo

Cuenta de prueba (seed en Supabase):

| Campo | Valor |
|-------|-------|
| Email | `demo@ninety.app` |
| Username | `@aficionado_demo` |
| Perfil público | [/u/aficionado_demo](https://ninety.up.railway.app/u/aficionado_demo) |

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

### 3. Tests automatizados

```bash
# Unit tests del backend
npm test

# Smoke Supabase + API (local o producción)
npm run smoke:v1
API_URL=https://ninety-api.up.railway.app FRONTEND_URL=https://ninety.up.railway.app npm run smoke:v1

# Flujo E2E demo: login, capsules, feed, comentarios, follow
npm run demo:flow
API_URL=https://ninety-api.up.railway.app npm run demo:flow

# Todo junto (unit + demo flow)
npm run test:v1
```

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

Nav: iconos solos en móvil, icono + texto desde `md` (768px).

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
| POST | `/api/auth/oauth/google` | — | Iniciar OAuth Google |
| POST | `/api/auth/oauth/exchange` | — | Intercambio PKCE OAuth |
| GET | `/api/profile/me` | ✅ | Perfil propio |
| PATCH | `/api/profile/me` | ✅ | Actualizar perfil |
| GET | `/api/profile/:username` | — | Perfil público (metadatos) |
| POST/DELETE | `/api/profile/:username/follow` | ✅ | Seguir / dejar de seguir |
| GET | `/api/capsules/me` | ✅ | Mis capsules |
| GET | `/api/capsules/feed` | ✅ | Feed (seguidos + tuyo) |
| GET | `/api/capsules/user/:username` | opcional | Perfil + capsules públicas |
| POST/PATCH/DELETE | `/api/capsules`… | ✅ | CRUD capsules |
| POST/DELETE | `/api/capsules/:id/like` | ✅ | Likes |
| GET/POST/DELETE | `/api/capsules/:id/comments`… | ✅ | Comentarios |
| GET | `/api/football/matches/search` | ✅ | Buscar partidos |
| GET | `/api/football/competitions` | ✅ | Competiciones |

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
- [ ] Compartir
- [ ] Wrapped anual

### 🚀 v3 — Avanzado
- [ ] IA (resúmenes, recomendaciones)
- [ ] Gamificación (insignias, logros)
- [ ] Mapa de estadios
- [ ] Estadísticas avanzadas

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
