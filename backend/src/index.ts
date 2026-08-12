import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config/loadEnv.js';
import { ensureCapsulePhotosBucket } from './lib/ensureStorage.js';
import { flushPushDigests } from './lib/pushDigest.js';
import { isPushConfigured } from './lib/webPush.js';

const PUSH_DIGEST_INTERVAL_MS = 15 * 60 * 1000;

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

  if (env.NODE_ENV === 'production' && isPushConfigured() && env.CRON_SECRET) {
    const runFlush = () => {
      void flushPushDigests().catch((err) => {
        console.warn('⚠️  Push digest:', err instanceof Error ? err.message : err);
      });
    };
    setTimeout(runFlush, 30_000);
    setInterval(runFlush, PUSH_DIGEST_INTERVAL_MS);
  }
}

main();
