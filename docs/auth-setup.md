# Configuración de Auth — Ninety

## Página de inicio

- `/` — Landing pública (index)
- `/home` — Dashboard (requiere login)
- `/auth/callback` — Retorno de Google OAuth
- `/auth/reset-password` — Recuperación de contraseña

## Dominio custom: `getninety.app` → Railway

Checklist para apuntar el dominio comprado al frontend en Railway **sin romper** `ninety.up.railway.app` durante la transición.

### Ops AHORA (orden fijo)

Canónico **hoy**: `https://www.getninety.app` (CNAME → Railway, `/health` = ok). Apex `getninety.app` **no resuelve** (sin A/AAAA/ALIAS; solo MX eforward Namecheap).

#### Estado medido (2026-08-03)

| Target | Resultado |
|--------|-----------|
| `https://www.getninety.app/health` | **200** `{"status":"ok"}` |
| `https://ninety.up.railway.app/health` | **200** `{"status":"ok"}` |
| `https://ninety-api.up.railway.app/api/health` | **200** `{"status":"ok","service":"ninety-api",...}` |
| `https://getninety.app/health` | **NXDOMAIN / no resolve** (sin A/ALIAS) |
| DNS `www` | `CNAME v0vc6p84.up.railway.app` → `69.46.46.10` |
| DNS apex | Solo MX eforward + SPF Namecheap (`include:spf.efwd.registrar-servers.com`) |
| Resend DNS (`resend._domainkey` / `send` / `_dmarc`) | **NXDOMAIN** — dominio Resend **no verificado** en DNS público |
| SMTP Supabase | **No medible desde fuera** — hay que mirar Dashboard (no inventar OK) |

Contacto producto en UI/legales: `hello@getninety.app` (no `hello@ninety.app`). Forwarding del buzón = Namecheap Email Forwarding / Resend según configures.

#### A) Railway frontend — puerto y dominio

1. Abre el servicio **frontend** (`ninety` / `ninety-frontend`), **no** el API
2. **Deployments → latest → Logs** → busca exactamente: `Ninety frontend listening on http://0.0.0.0:N`
3. Anota **N** (Railway suele inyectar `8080`; **no** uses `4173` a ciegas)
4. **Settings → Networking → Custom Domain** → `www.getninety.app` → **Target Port = N** (www ya da 200; solo toca esto si vuelve 502)
5. Start Command = `node serve.mjs` (no `vite preview` salvo que sepas lo que haces)
6. Prueba: `curl -sS https://www.getninety.app/health` → `{"status":"ok"}`  
   Fallback: `curl -sS https://ninety.up.railway.app/health` → `ok`  
   API: `curl -sS https://ninety-api.up.railway.app/api/health` → `ok`

#### B) Namecheap DNS (apex)

1. **Domain List → getninety.app → Advanced DNS**
2. Si existe **URL Redirect** / **Redirect** en `@` (apex) o `www` hacia parking u otra URL → **bórralo** (rompe o compite con Railway)
3. Mantén **CNAME** `www` → `v0vc6p84.up.railway.app` (o el target actual del panel Railway)
4. **Apex** (para que `https://getninety.app` resuelva):
   - En Railway → Custom Domain → añade `getninety.app` → copia el registro que pida (suele ser **ALIAS/ANAME** o IPs **A**)
   - Namecheap: crea ese registro en `@`. **No** uses URL Redirect como sustituto
   - Sin A/ALIAS en `@`, el apex **seguirá sin resolver** (MX eforward solo = email del registrador; normal)
5. Espera propagación; en Railway el dominio debe quedar **Active** (TLS verde)

#### C) Variables Railway — lista verify

**Frontend** (`ninety`) — tras cambiar `VITE_*` hace falta **Rebuild/Redeploy**:

```env
VITE_API_URL=https://ninety-api.up.railway.app
API_URL=https://ninety-api.up.railway.app
SITE_URL=https://www.getninety.app
VITE_SITE_URL=https://www.getninety.app
```

**Backend** (`ninety-api`) — sin rebuild de imagen Vite, pero redeploy si el panel lo pide:

```env
NODE_ENV=production
CLIENT_URL=https://www.getninety.app
CORS_ORIGINS=https://getninety.app,https://ninety.up.railway.app
```

> CORS ya incluye por defecto apex, www y Railway. `CORS_ORIGINS` refuerza extras. Cuando el apex esté vivo y quieras canónico sin www, cambia `SITE_URL` / `VITE_SITE_URL` / `CLIENT_URL` a `https://getninety.app` y vuelve a rebuild del front.

#### D) Supabase → Authentication → URL Configuration

**Site URL** (canónico = www):

```
https://www.getninety.app
```

**Redirect URLs** (copy-paste; mantén Railway de fallback):

```
http://localhost:5173/auth/callback
http://localhost:5173/auth/reset-password
http://localhost:5173/**
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

#### E) Email Auth + Resend (ops; no magic link)

1. **Authentication → Providers → Email**: confirmación ON/OFF según quieras registro con click
2. **SMTP** en Supabase → Project Settings → Authentication → SMTP:
   - **No asumir OK.** Built-in = una prueba (remitente `supabase.io`, rate limits)
   - Prod: Enable custom SMTP → Resend (host `smtp.resend.com`, user `resend`, pass = API key)
   - Remitente: p. ej. `noreply@getninety.app` (dominio verificado en Resend)
3. **Resend → Domains → getninety.app**: añade los DNS que pida (DKIM / SPF / opcional DMARC). Hoy DNS público **no** tiene `resend._domainkey` ni `send` — hay que verificar
4. Plantillas Confirm signup / Reset password: enlace vía Site URL / Redirect URLs de arriba
5. Probar en **www** (ya live): registro + forgot-password en `https://www.getninety.app`

### 1. DNS (detalle)

| Tipo | Nombre / Host | Valor | TTL |
|------|---------------|-------|-----|
| **CNAME** | `www` | target CNAME de Railway | 300–3600 |
| **ALIAS/ANAME** o lo que diga Railway | `@` | solo si quieres apex sin www* | 300–3600 |

\*Namecheap: sin ALIAS, el apex no puede ser CNAME clásico. Quítalo el **URL Redirect** del `@` si interfiere.

En **Railway → servicio frontend → Settings → Networking / Custom Domain**:

1. Dominios solo en el **frontend**, no en el API
2. TLS **Active** / DNS verde no basta si Target Port ≠ `PORT`
3. API puede seguir en `https://ninety-api.up.railway.app`

#### Si ves «Application failed to respond» (502)

Causa habitual: Target Port (p. ej. `4173`) ≠ `PORT` del contenedor.

1. Logs → `Ninety frontend listening on http://0.0.0.0:N`
2. Target Port = **N**
3. Opcional: Variables `PORT=8080` **y** Target Port `8080`
4. Start Command = `node serve.mjs`
5. `curl -sS https://www.getninety.app/health` → `{"status":"ok"}`

### 2. Variables de entorno (Railway) — resumen

Ver **Ops AHORA → C**. `API_URL` / `SITE_URL` las usa `serve.mjs` (Open Graph). El backend permite por defecto `CLIENT_URL`, localhost, `https://ninety.up.railway.app`, `https://getninety.app` y `https://www.getninety.app`.

### 3. Supabase URL Configuration — resumen

Ver **Ops AHORA → D** (lista completa).

### 4. Google OAuth (si usas Google)

En [Google Cloud Console](https://console.cloud.google.com/) → Credentials → tu OAuth Client:

- **Authorized JavaScript origins:** `https://www.getninety.app`, `https://getninety.app`, `https://ninety.up.railway.app`
- **Authorized redirect URIs** de Google siguen siendo las de Supabase:
  ```
  https://TU-PROYECTO.supabase.co/auth/v1/callback
  ```
  (no cambian con el dominio de la app)

### 5. Verificación rápida

1. `https://www.getninety.app/health` → `{"status":"ok"}` (y apex si lo configuraste)
2. Login email + Google (si aplica) → `/auth/callback` en el dominio canónico
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

1. Supabase → Authentication → **URL Configuration**: Site URL = canónico actual (`https://www.getninety.app` cuando `/health` esté ok; si no, `https://ninety.up.railway.app`).
2. **Redirect URLs** con `/auth/callback`, `/auth/reset-password` y `/**` para cada origen (ver **Ops AHORA → D**).
3. `CLIENT_URL` en Railway API alineado con ese origen (recovery `redirectTo`).
4. SMTP custom (o aceptar límites built-in) + remitente verificado en el dominio.
5. Revisar plantillas Confirm signup / Reset password (enlace y branding).
6. Probar: registro nuevo → email llega; forgot-password → enlace abre `/auth/reset-password` y cambia password.

Hasta completar 1–5 en el proyecto Supabase / Railway, los flujos de email quedan **parciales** (código OK, entrega/redirects = responsabilidad ops).

### Probar email AHORA (checklist)

**www está live** (`/health` = ok). Probar en canónico, no en Railway salvo fallback.

1. **Supabase → Authentication → URL Configuration:** Site URL = `https://www.getninety.app`. Redirect URLs: lista de **Ops AHORA → D**.
2. **SMTP:** abrir Dashboard y anotar: built-in vs custom. Si custom Resend → dominio debe estar **Verified** en Resend (hoy DNS sin DKIM Resend).
3. **Registro:** `https://www.getninety.app/register` → email real → confirmar (si confirmación ON) → login.
4. **Recovery:** `/forgot-password` → enlace → `/auth/reset-password` → nueva password → login.
5. Fallback solo si www falla: misma prueba en `https://ninety.up.railway.app` con Site URL temporal alineado.

> No inventes que SMTP/Redirects ya estén en prod: hay que verificarlos en el Dashboard. El código de signup/recovery/callback ya está listo. DNS Resend medible: `host -t TXT resend._domainkey.getninety.app` (hoy NXDOMAIN).

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
