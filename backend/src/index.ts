import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config/loadEnv.js';
import { ensureCapsulePhotosBucket } from './lib/ensureStorage.js';

async function main() {
  try {
    await ensureCapsulePhotosBucket();
  } catch (err) {
    console.warn('⚠️  Storage de fotos:', err instanceof Error ? err.message : err);
  }

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`Ninety API running on http://localhost:${env.PORT}`);
  });
}

main();
