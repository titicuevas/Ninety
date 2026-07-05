/**
 * Prueba rápida de búsqueda football — npm run probe:search --prefix backend
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clearFootballCache } from '../src/lib/footballCache.js';
import { searchMatches } from '../src/lib/footballSearch.js';
import { fetchFootballApi } from '../src/lib/footballApi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });
clearFootballCache();

async function main() {
  const pdTeams = await fetchFootballApi<{ teams?: Array<{ id?: number; name: string }> }>('/competitions/PD/teams');
  const betis = pdTeams.teams?.find((t) => t.name.includes('Betis'));
  const ecTeams = await fetchFootballApi<{ teams?: Array<{ id?: number; name: string }> }>('/competitions/EC/teams?season=2024');
  const spain = ecTeams.teams?.find((t) => t.name === 'Spain');

  for (const [label, path] of [
    ['Betis all', `/teams/${betis?.id}/matches`],
    ['Betis PD finished', `/teams/${betis?.id}/matches?status=FINISHED&competitions=2014`],
    ['Betis PD any', `/teams/${betis?.id}/matches?competitions=2014`],
    ['Spain EC', `/teams/${spain?.id}/matches?status=FINISHED&competitions=2018&season=2024`],
  ] as const) {
    try {
      const res = await fetchFootballApi<{ matches?: unknown[] }>(path);
      console.log(label, '→', res.matches?.length ?? 0, 'partidos');
    } catch (err) {
      console.log(label, '→ ERROR', err instanceof Error ? err.message : err);
    }
  }

  const cases = [
    { query: 'betis', competition: 'PD' },
    { query: 'españa', competition: 'EC', season: 2024 },
    { query: 'españa', competition: 'WC', season: 2022 },
    { query: 'betis' },
  ] as const;

  for (const c of cases) {
    const matches = await searchMatches({ ...c });
    console.log(
      `Búsqueda ${JSON.stringify(c)} → ${matches.length} partidos`,
      matches.slice(0, 2).map((m) => `${m.homeTeam.name} vs ${m.awayTeam.name} [${m.competition?.code}]`),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
