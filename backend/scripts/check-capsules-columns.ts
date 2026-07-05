import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SECRET_KEY!;
const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const cols = 'id,user_id,match_id,home_team_name,away_team_name,home_score,away_score,photo_urls,watched_at';
const { error } = await admin.from('capsules').select(cols).limit(0);
console.log(error ? `ERROR: ${error.message}` : 'OK: all columns accessible');
