<p align="center">
  <img src="frontend/public/favicon.svg" alt="Ninety" width="64" height="64" />
</p>

<h1 align="center">Ninety</h1>

<p align="center">
  <strong>Tu diario futbolero.</strong><br/>
  Guarda y revive todos los partidos que has visto a lo largo de tu vida.
</p>

<p align="center">
  <a href="#-concepto">Concepto</a> •
  <a href="#-stack">Stack</a> •
  <a href="#-inicio-rápido">Inicio rápido</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

---

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

| Servicio | URL |
|----------|-----|
| **Frontend** | https://ninety.up.railway.app |
| **API** | https://ninety-api.up.railway.app |
| **Health** | https://ninety-api.up.railway.app/api/health |

### Variables en Railway

**Frontend** (`ninety`):
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_API_URL=https://ninety-api.up.railway.app
```

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

Guía completa de auth: [`docs/auth-setup.md`](docs/auth-setup.md)

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

## 🔐 API Endpoints (v0.2)

| Método | Ruta                        | Descripción              |
|--------|-----------------------------|--------------------------|
| GET    | `/api/health`               | Health check             |
| GET    | `/api/profile/me`           | Perfil del usuario       |
| PATCH  | `/api/profile/me`           | Actualizar perfil        |
| GET    | `/api/profile/:username`    | Perfil público           |
| GET    | `/api/football/matches/search?q=` | Buscar partidos   |
| GET    | `/api/football/competitions`| Listar competiciones     |
| GET    | `/api/football/teams?q=`    | Buscar equipos           |

## 📅 Roadmap

### ✅ v0.2 — Fundación (actual)
- [x] Estructura frontend/backend separada
- [x] Autenticación (email + Google OAuth)
- [x] Landing pública (`/`) + dashboard (`/home`)
- [x] Perfil de usuario editable
- [x] shadcn/ui + Radix UI + Express 5
- [x] Integración football-data.org (proxy API)
- [x] Storage + Realtime preparados (migración SQL)
- [x] Tests + seguridad (`check:secrets`)
- [x] Deploy en Railway

### 🔜 v1 — MVP
- [ ] Buscar partidos
- [ ] Crear Capsule (recuerdo de partido)
- [ ] Mis Capsules
- [ ] Feed social básico
- [ ] Estadísticas básicas

### 🔮 v2 — Social
- [ ] Fotos
- [ ] Amigos
- [ ] Comentarios, likes, compartir
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
