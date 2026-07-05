/**
 * npm run probe:team-comps --prefix backend
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clearFootballCache } from '../src/lib/footballCache.js';
import { getTeamCompetitionsForQuery } from '../src/lib/footballTeamCompetitions.js';
import { fetchFootballApi } from '../src/lib/footballApi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });
clearFootballCache();

async function probeTeam(name: string, id: number) {
  console.log(`\n=== ${name} (${id}) ===`);

  const detail = await fetchFootballApi<{
    runningCompetitions?: Array<{ id?: number; code?: string; name?: string }>;
  }>(`/teams/${id}`);

  console.log(
    'runningCompetitions:',
    detail.runningCompetitions?.map((c) => `${c.code} (${c.name})`).join(', ') || '(vacío)',
  );

  for (const path of [
    `/teams/${id}/matches?status=FINISHED`,
    `/teams/${id}/matches`,
    `/teams/${id}/matches?limit=100`,
  ]) {
    const data = await fetchFootballApi<{
      resultSet?: { competitions?: string };
      matches?: Array<{ competition?: { code?: string; name?: string } }>;
    }>(path);

    const fromResultSet = data.resultSet?.competitions ?? '(sin resultSet)';
    const fromMatches = [...new Set((data.matches ?? []).map((m) => m.competition?.code).filter(Boolean))];
    console.log(path);
    console.log('  resultSet.competitions:', fromResultSet);
    console.log('  unique match codes:', fromMatches.join(', ') || '(ninguno)');
  }
}

async function main() {
  const pd = await fetchFootballApi<{ teams?: Array<{ id: number; name: string }> }>('/competitions/PD/teams');
  const barca = pd.teams?.find((t) => t.name.includes('Barcelona') && !t.name.includes('Espanyol'));
  const betis = pd.teams?.find((t) => t.name.includes('Betis'));

  if (barca) await probeTeam(barca.name, barca.id);
  if (betis) await probeTeam(betis.name, betis.id);

  for (const q of ['barcelona', 'betis']) {
    const result = await getTeamCompetitionsForQuery(q);
    console.log(
      `\ngetTeamCompetitionsForQuery("${q}"):`,
      result.competitions.map((c) => c.code).join(', '),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
