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

## Plantillas email (ES) — pegar en Supabase

Dashboard → **Authentication → Email Templates**.

Sustituye **Subject** + **Body** de **Confirm signup** y **Reset password (Recovery)**. Usa exactamente las variables `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`, `{{ .Email }}`.

El código ya envía `emailRedirectTo` / `redirectTo` a `{CLIENT_URL}/auth/callback` (signup) y `{CLIENT_URL}/auth/reset-password` (recovery). `{{ .ConfirmationURL }}` incluye ese redirect.

> **Importante:** estas plantillas **no salen del repo**. Hay que pegarlas a mano en el Dashboard. Tras cambiarlas, manda un email de prueba (registro o forgot-password).

**Recordatorio Site URL:** Authentication → URL Configuration → Site URL = `https://www.getninety.app` (y Redirect URLs con `/auth/callback` + `/auth/reset-password`). Si Site URL apunta a otro origen, el enlace del mail puede dejar el hash en `/` o fallar.

### Confirm signup

**Subject:**

```
Confirma tu cuenta en Ninety
```

**Body:** (copiar todo el bloque HTML)

```html
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050506;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050506;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#0a0a0b;border:1px solid #1f2937;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:28px 28px 8px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;">
            <table role="presentation" cellspacing="0" cellpadding="0">
              <tr>
                <td style="width:40px;height:40px;border-radius:10px;background:#10b981;color:#042f1e;font-weight:800;font-size:14px;text-align:center;vertical-align:middle;line-height:40px;">90</td>
                <td style="padding-left:12px;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#fafafa;">Ninety</td>
              </tr>
            </table>
            <p style="margin:20px 0 0;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#34d399;">Diario futbolero</p>
            <h1 style="margin:8px 0 16px;font-size:24px;line-height:1.25;color:#fafafa;font-weight:700;">Confirma tu email</h1>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#a1a1aa;">
              Hola{{ if .Data.display_name }} {{ .Data.display_name }}{{ end }}, gracias por unirte a Ninety — tu diario de partidos vistos.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#a1a1aa;">
              Pulsa el botón para activar la cuenta de <strong style="color:#fafafa;">{{ .Email }}</strong>.
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
              <tr>
                <td style="border-radius:10px;background:#10b981;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;color:#042f1e;text-decoration:none;border-radius:10px;">
                    Confirmar email
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#71717a;">Si el botón no funciona, copia y pega este enlace:</p>
            <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all;color:#34d399;">{{ .ConfirmationURL }}</p>
            <p style="margin:0;font-size:12px;line-height:1.5;color:#52525b;">Si no creaste una cuenta en Ninety, ignora este correo.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 24px;border-top:1px solid #1f2937;font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;color:#52525b;">
            <a href="https://www.getninety.app" style="color:#10b981;text-decoration:none;font-weight:600;">www.getninety.app</a>
            · Site: {{ .SiteURL }}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

### Recovery (Reset password)

**Subject:**

```
Restablece tu contraseña de Ninety
```

**Body:**

```html
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050506;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050506;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#0a0a0b;border:1px solid #1f2937;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:28px 28px 8px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;">
            <table role="presentation" cellspacing="0" cellpadding="0">
              <tr>
                <td style="width:40px;height:40px;border-radius:10px;background:#10b981;color:#042f1e;font-weight:800;font-size:14px;text-align:center;vertical-align:middle;line-height:40px;">90</td>
                <td style="padding-left:12px;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#fafafa;">Ninety</td>
              </tr>
            </table>
            <p style="margin:20px 0 0;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#34d399;">Seguridad de cuenta</p>
            <h1 style="margin:8px 0 16px;font-size:24px;line-height:1.25;color:#fafafa;font-weight:700;">Nueva contraseña</h1>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#a1a1aa;">
              Hemos recibido una solicitud para restablecer la contraseña de <strong style="color:#fafafa;">{{ .Email }}</strong>.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#a1a1aa;">
              El enlace caduca pronto y solo se puede usar una vez.
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
              <tr>
                <td style="border-radius:10px;background:#10b981;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;color:#042f1e;text-decoration:none;border-radius:10px;">
                    Elegir nueva contraseña
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#71717a;">Si el botón no funciona, copia y pega este enlace:</p>
            <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all;color:#34d399;">{{ .ConfirmationURL }}</p>
            <p style="margin:0;font-size:12px;line-height:1.5;color:#52525b;">Si no pediste este cambio, ignora el correo — tu contraseña no se modifica.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 24px;border-top:1px solid #1f2937;font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;color:#52525b;">
            <a href="https://www.getninety.app" style="color:#10b981;text-decoration:none;font-weight:600;">www.getninety.app</a>
            · Site: {{ .SiteURL }}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

### Instrucciones exactas en Supabase

1. Abre [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto Ninety
2. **Authentication → URL Configuration**
   - **Site URL:** `https://www.getninety.app`
   - **Redirect URLs:** incluye al menos  
     `https://www.getninety.app/auth/callback`  
     `https://www.getninety.app/auth/reset-password`  
     (y los de Railway/apex de la sección Ops si aplica)
3. **Authentication → Email Templates**
   - Plantilla **Confirm signup**: pega Subject + Body de arriba
   - Plantilla **Reset password** (Recovery): pega Subject + Body de Recovery
4. Guarda cada plantilla → prueba registro + forgot-password en `https://www.getninety.app`
5. **SMTP** (recomendado prod): Remitente `noreply@getninety.app` vía Resend; dominio verificado
6. Railway API: `CLIENT_URL=https://www.getninety.app` (debe coincidir con el origen canónico)

Logo en email: badge tipográfico «90» + wordmark Ninety (inline). Favicon público opcional: `https://www.getninety.app/favicon.svg` — no es necesario para que el HTML funcione.

### Qué debe configurar Henry en Supabase (checklist)

1. Site URL + Redirect URLs (paso 2)
2. Pegar Confirm signup + Recovery (paso 3)
3. SMTP Resend si aún no
4. `CLIENT_URL` en Railway alineado con www

---

## Prompt logo / icono PWA (copy-paste)

El favicon SVG del repo ya usa dark `#0a0a0b` + verde `#10b981` con “90”. Para regenerar PNG 192/512 / maskable / apple-touch con otra IA:

```
App icon for “Ninety”, a football fan diary (match memories). Square app icon, 1024×1024.
Style: sports newspaper / matchday programme meets modern PWA — bold condensed “90” as the hero mark (not a soccer ball clipart).
Colors: near-black background #0a0a0b, emerald accent #10b981, subtle pitch-line or centre-circle geometry behind the numerals, thin emerald border, soft corner radius ~22%.
Mood: night match, editorial, confident. No purple, no glow soup, no photoreal ball, no generic sans wordmark besides “90”.
Deliver: flat vector-like icon suitable for favicon + PWA 192/512 and maskable (keep safe zone: “90” inside central 80%).
```

Tras generar: sustituye `frontend/public/icon-192.png`, `icon-512.png`, `*-maskable.png`, `apple-touch-icon.png` alineados a esa paleta.

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
