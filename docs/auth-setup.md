# Configuración de Auth — Ninety

## Página de inicio

- `/` — Landing pública (index)
- `/home` — Dashboard (requiere login)
- `/auth/callback` — Retorno de Google OAuth
- `/auth/reset-password` — Recuperación de contraseña

## Dominio custom: `getninety.app` → Railway

Checklist para apuntar el dominio comprado al frontend en Railway **sin romper** `ninety.up.railway.app` durante la transición.

### 1. DNS (registrador del dominio)

En el panel DNS de `getninety.app`:

| Tipo | Nombre / Host | Valor | TTL |
|------|---------------|-------|-----|
| **CNAME** | `@` o raíz* | el target CNAME que muestra Railway (p. ej. `xxxxx.up.railway.app`) | 300–3600 |
| **CNAME** | `www` | el mismo target de Railway | 300–3600 |

\*Si el registrador no permite CNAME en apex (`@`), usa el registro **ALIAS / ANAME** que ofrezca, o el flujo «Custom Domain» de Railway (te indica registros exactos).

En **Railway → servicio frontend (`ninety-frontend` / `ninety`) → Settings → Networking / Custom Domain**:

1. Añade `getninety.app` y `www.getninety.app` **en el servicio del frontend**, no en el API
2. Copia los registros DNS que indique el panel
3. Espera el certificado TLS (Let's Encrypt) hasta estado **Active** / DNS verificado en verde
4. **Target Port:** debe ser el mismo puerto en el que escucha la app (ver logs: `listening on http://0.0.0.0:XXXX`). Railway inyecta `PORT` (a menudo `8080`); **no** asumas `4173` salvo que hayas fijado `PORT=4173` en Variables

#### Si ves «Application failed to respond» (502)

Causa habitual: el dominio apunta a un puerto (p. ej. `4173`) distinto del `PORT` real del contenedor.

1. Deploy logs del frontend → busca `Ninety frontend listening on http://0.0.0.0:N`
2. Settings → Networking → edita el dominio → **Target Port = N** (el mismo)
3. Opcional y más estable: Variables → `PORT=8080` (o `4173`) **y** Target Port idéntico
4. Confirma Start Command = `node serve.mjs` (no `vite preview` a menos que `preview.host` sea `0.0.0.0`)
5. Prueba `/health` en el dominio: debe devolver `{"status":"ok"}`

La API puede seguir en `https://ninety-api.up.railway.app` (no hace falta dominio custom en el API para este corte).

### 2. Variables de entorno (Railway)

**Frontend** (`ninety`):

```env
VITE_API_URL=https://ninety-api.up.railway.app
API_URL=https://ninety-api.up.railway.app
SITE_URL=https://getninety.app
VITE_SITE_URL=https://getninety.app
```

> `API_URL` / `SITE_URL` las usa `serve.mjs` (Open Graph, previews).
> Tras cambiar `VITE_*`, hace falta **redeploy** del frontend (se inyectan en el build).

**Backend** (`ninety-api`):

```env
NODE_ENV=production
CLIENT_URL=https://getninety.app
```

Opcional (orígenes extra, separados por coma), si sirves apex + www a la vez o mantienes el subdominio Railway:

```env
CORS_ORIGINS=https://www.getninety.app,https://ninety.up.railway.app
```

El backend ya permite por defecto `CLIENT_URL`, localhost (dev), `https://ninety.up.railway.app`, `https://getninety.app` y `https://www.getninety.app`.

### 3. Supabase → Authentication → URL Configuration

**Site URL** (producción):

```
https://getninety.app
```

**Redirect URLs** (mantén Railway mientras dure la transición):

```
http://localhost:5173/auth/callback
http://localhost:5173/auth/reset-password
http://localhost:5173/**
https://getninety.app/auth/callback
https://getninety.app/auth/reset-password
https://getninety.app/**
https://www.getninety.app/auth/callback
https://www.getninety.app/auth/reset-password
https://www.getninety.app/**
https://ninety.up.railway.app/auth/callback
https://ninety.up.railway.app/auth/reset-password
https://ninety.up.railway.app/**
```

### 4. Google OAuth (si usas Google)

En [Google Cloud Console](https://console.cloud.google.com/) → Credentials → tu OAuth Client:

- **Authorized JavaScript origins:** `https://getninety.app`, `https://www.getninety.app` (y Railway si aún lo usas)
- **Authorized redirect URIs** de Google siguen siendo las de Supabase:
  ```
  https://TU-PROYECTO.supabase.co/auth/v1/callback
  ```
  (no cambian con el dominio de la app)

### 5. Verificación rápida

1. `https://getninety.app` carga la app (TLS OK)
2. Login email + Google (si aplica) → vuelve a `/auth/callback` en el dominio nuevo
3. Reset password → `/auth/reset-password`
4. CORS: crear/listar capsules desde el dominio nuevo (sin error en consola)
5. Compartir un perfil `/u/...`, capsule `/c/...`, colección `/u/.../lists/...` o cara a cara `/u/.../vs` (preview OG usa `SITE_URL`)
6. PWA: manifest + PNG 192/512 (y maskable) + apple-touch-icon en el origen nuevo

---

## Email Auth — código vs ops

El producto **no** envía correos desde el backend propio: signup, confirmación y recovery pasan por **Supabase Auth**.

| Flujo | Código | Ops (Supabase / DNS) |
|-------|--------|----------------------|
| Crear usuario (`POST /api/auth/register` → `signUp`) | Listo | Confirmación email según Auth → Providers → Email; SMTP o built-in |
| Recovery (`/forgot-password` → `resetPasswordForEmail` → `/auth/reset-password`) | Listo | Redirect URL `{CLIENT_URL}/auth/reset-password`; plantilla Recovery |
| Magic link / OTP | **No implementado** | N/A hasta producto |
| Google OAuth | Listo | Provider Google + Redirect URLs |

### Built-in vs SMTP custom

- **Built-in (Supabase):** vale para pruebas; límites de tasa y remitente `supabase.io`. En prod suele ser insuficiente.
- **SMTP custom:** obligatorio para entrega fiable (p. ej. Resend, Postmark, SES, o Mailtrap solo en sandbox). Config en Supabase → Project Settings → Authentication → SMTP. **Resend no está cableado en el repo**; si lo usas, es solo SMTP en el dashboard.
- Docs de prueba local: sección Mailtrap más abajo.

### Checklist ops (faltante típico en prod)

1. Supabase → Authentication → **URL Configuration**: Site URL = origen real del frontend (`https://ninety.up.railway.app` y/o `https://getninety.app` cuando el dominio deje de dar 502).
2. **Redirect URLs** con `/auth/callback`, `/auth/reset-password` y `/**` para cada origen (ver lista arriba).
3. `CLIENT_URL` en Railway API alineado con ese origen (recovery `redirectTo`).
4. SMTP custom (o aceptar límites built-in) + remitente verificado en el dominio.
5. Revisar plantillas Confirm signup / Reset password (enlace y branding).
6. Probar: registro nuevo → email llega; forgot-password → enlace abre `/auth/reset-password` y cambia password.

Hasta completar 1–5 en el proyecto Supabase / Railway, los flujos de email están **parciales** (código OK, entrega/redirects = responsabilidad ops).

### Probar email AHORA (checklist)

Usar el frontend Railway (`https://ninety.up.railway.app`), **no** `getninety.app` mientras dé 502.

1. **Supabase → Authentication → URL Configuration:** Site URL = `https://ninety.up.railway.app`. Redirect URLs deben incluir `/auth/callback`, `/auth/reset-password` y `/**` de ese origen (y localhost si pruebas en local).
2. **Supabase → Authentication → Emails / SMTP:** built-in vale para una prueba; si no llega nada, activa SMTP custom (Mailtrap/Resend/etc.) o mira rate limit del built-in.
3. **Registro:** abre `https://ninety.up.railway.app/register` → email real → bandeja/spam → click confirmar → login.
4. **Recovery:** `/forgot-password` → mismo email → enlace → `/auth/reset-password` → nueva contraseña → login.
5. **Si falla:** sin email → SMTP / rate limit / carpeta spam. Link roto o va a otro dominio → Redirect URLs o `CLIENT_URL` / Site URL no alineados con Railway.

> No inventes que SMTP/Redirects ya estén en prod: hay que verificarlos en el Dashboard. El código de signup/recovery/callback ya está listo.

---

## Google OAuth (Supabase) — setup inicial

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Crear **OAuth 2.0 Client ID** (Web application)
3. **Authorized redirect URIs:**
   ```
   https://TU-PROYECTO.supabase.co/auth/v1/callback
   ```
4. En **Supabase** → Authentication → Providers → Google:
   - Activar Google
   - Pegar Client ID y Client Secret de Google
5. En **Supabase** → Authentication → URL Configuration: ver checklist de dominio custom arriba (o localhost en dev)

## Email con Mailtrap (pruebas)

El token de API de Mailtrap **no** va en el código. Configúralo en Supabase:

1. [Mailtrap](https://mailtrap.io/) → Email Testing → tu Inbox → **SMTP Settings**
2. En **Supabase** → Project Settings → Authentication → SMTP Settings:
   - Enable custom SMTP
   - Host: `sandbox.smtp.mailtrap.io`
   - Port: `587` (TLS) o `2525`
   - User / Password: los de tu inbox de Mailtrap (no el API token)
   - Sender email: `noreply@getninety.app` (o el que quieras)

Los emails de confirmación y reset aparecerán en tu inbox de Mailtrap.

## Usuario de prueba

Añade en `backend/.env` (nunca en Git):

```bash
TEST_USER_EMAIL=demo@ninety.app
TEST_USER_PASSWORD=tu-contraseña-local-segura
```

```bash
npm run seed:test-user
# o datos completos con partidos de ejemplo:
npm run seed:demo
```

Luego inicia sesión en `/login` con esas credenciales.

> Si GitHub te avisó de una contraseña filtrada, cámbiala en Supabase
> (Authentication → Users → demo@ninety.app → Reset password) y actualiza `TEST_USER_PASSWORD`.
