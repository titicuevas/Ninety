import { config } from 'dotenv';
import { resolveEnv } from './env.js';

if (process.env.NODE_ENV !== 'test') {
  config();
}

export const env = resolveEnv(process.env);
