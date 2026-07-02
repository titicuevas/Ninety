# Configuración de Auth — Ninety

## Página de inicio

- `/` — Landing pública (index)
- `/home` — Dashboard (requiere login)
- `/auth/callback` — Retorno de Google OAuth

## Google OAuth (Supabase)

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Crear **OAuth 2.0 Client ID** (Web application)
3. **Authorized redirect URIs:**
   ```
   https://TU-PROYECTO.supabase.co/auth/v1/callback
   ```
4. En **Supabase** → Authentication → Providers → Google:
   - Activar Google
   - Pegar Client ID y Client Secret de Google
5. En **Supabase** → Authentication → URL Configuration:
   - **Site URL:** `http://localhost:5173` (dev) o tu dominio en producción
   - **Redirect URLs:**
     ```
   http://localhost:5173/auth/callback
   http://localhost:5173/**
   https://ninety.up.railway.app/auth/callback
   https://ninety.up.railway.app/**
     ```

## Email con Mailtrap (pruebas)

El token de API de Mailtrap **no** va en el código. Configúralo en Supabase:

1. [Mailtrap](https://mailtrap.io/) → Email Testing → tu Inbox → **SMTP Settings**
2. En **Supabase** → Project Settings → Authentication → SMTP Settings:
   - Enable custom SMTP
   - Host: `sandbox.smtp.mailtrap.io`
   - Port: `587` (TLS) o `2525`
   - User / Password: los de tu inbox de Mailtrap (no el API token)
   - Sender email: `noreply@ninety.app` (o el que quieras)

Los emails de confirmación y reset aparecerán en tu inbox de Mailtrap.

## Usuario de prueba

```bash
# Opcional en backend/.env:
# TEST_USER_EMAIL=demo@ninety.app
# TEST_USER_PASSWORD=TuPasswordSegura123!

npm run seed:test-user
```

Luego inicia sesión en `/login` con esas credenciales.
