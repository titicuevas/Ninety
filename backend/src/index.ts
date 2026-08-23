import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config/loadEnv.js';
import { flushDiaryPushes } from './lib/diaryPush.js';
import { flushEmailDigests } from './lib/emailDigest.js';
import { ensureCapsulePhotosBucket } from './lib/ensureStorage.js';
import { flushPushDigests } from './lib/pushDigest.js';
import { isResendConfigured } from './lib/resendEmail.js';
import { flushWantToGoPushes } from './lib/wantToGoPush.js';
import { isPushConfigured } from './lib/webPush.js';
import { setRuntimeReady } from './lib/runtimeHealth.js';
import { safeErrorLog } from './lib/safeErrorLog.js';

const PUSH_DIGEST_INTERVAL_MS = 15 * 60 * 1000;
const PUSH_DIARY_INTERVAL_MS = 60 * 60 * 1000;
const EMAIL_DIGEST_INTERVAL_MS = 60 * 60 * 1000;

async function main() {
  const backgroundTimers: NodeJS.Timeout[] = [];
  try {
    await ensureCapsulePhotosBucket();
  } catch (err) {
    console.warn('⚠️  Storage de fotos:', err instanceof Error ? err.message : err);
  }

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    setRuntimeReady(true);
    console.log(`Ninety API running on http://localhost:${env.PORT}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    setRuntimeReady(false);
    for (const timer of backgroundTimers) clearTimeout(timer);
    console.log(`[shutdown] ${signal}: cerrando servidor`);
    server.close((err) => {
      if (err) {
        console.error('[shutdown-error]', safeErrorLog(err));
        process.exitCode = 1;
      }
    });
    const forceExit = setTimeout(() => {
      console.error('[shutdown-timeout] cierre forzado tras 10s');
      process.exit(1);
    }, 10_000);
    forceExit.unref();
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  if (env.NODE_ENV === 'production' && isPushConfigured() && env.CRON_SECRET) {
    const runFlush = () => {
      void flushPushDigests().catch((err) => {
        console.warn('⚠️  Push digest:', err instanceof Error ? err.message : err);
      });
    };
    backgroundTimers.push(setTimeout(runFlush, 30_000));
    backgroundTimers.push(setInterval(runFlush, PUSH_DIGEST_INTERVAL_MS));

    const runDiaryFlush = () => {
      void flushDiaryPushes().catch((err) => {
        console.warn('⚠️  Push diary:', err instanceof Error ? err.message : err);
      });
      void flushWantToGoPushes().catch((err) => {
        console.warn('⚠️  Push Quiero ir:', err instanceof Error ? err.message : err);
      });
    };
    backgroundTimers.push(setTimeout(runDiaryFlush, 90_000));
    backgroundTimers.push(setInterval(runDiaryFlush, PUSH_DIARY_INTERVAL_MS));
  }

  if (env.NODE_ENV === 'production' && isResendConfigured() && env.CRON_SECRET) {
    const runEmailDigest = () => {
      void flushEmailDigests().catch((err) => {
        console.warn('⚠️  Email digest:', err instanceof Error ? err.message : err);
      });
    };
    backgroundTimers.push(setTimeout(runEmailDigest, 120_000));
    backgroundTimers.push(setInterval(runEmailDigest, EMAIL_DIGEST_INTERVAL_MS));
  }
}

void main().catch((err) => {
  setRuntimeReady(false);
  console.error('[startup-error]', safeErrorLog(err));
  process.exitCode = 1;
});
