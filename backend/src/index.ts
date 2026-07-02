import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config/loadEnv.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Ninety API running on http://localhost:${env.PORT}`);
});
