/**
 * Credenciales del usuario de prueba — solo desde backend/.env (nunca hardcodeadas).
 */
export function requireTestCredentials(): { email: string; password: string } {
  const email = process.env.TEST_USER_EMAIL ?? 'demo@ninety.app';
  const password = process.env.TEST_USER_PASSWORD;

  if (!password) {
    throw new Error(
      'Falta TEST_USER_PASSWORD en backend/.env\n' +
        'Usa una contraseña local de prueba (no la subas a Git). Ver backend/.env.example',
    );
  }

  return { email, password };
}
