import type { Capsule } from '@/types/capsule';
import type { CapsuleStats, WrappedScope } from '@/lib/capsuleStats';
import { MONTH_NAMES_ES, formatRating } from '@/lib/capsuleStats';
import type { AdvancedStats } from '@/lib/advancedStats';
import type { StadiumMapResult } from '@/lib/stadiumMap';
import { teamPath } from '@/lib/teamPath';

export type InsightKind = 'summary' | 'match' | 'people' | 'tip';

export type Insight = {
  id: string;
  kind: InsightKind;
  title: string;
  body: string;
  /** Ruta interna opcional (CTA). */
  href?: string;
  hrefLabel?: string;
};

export type InsightsInput = {
  name: string;
  scope: WrappedScope;
  stats: CapsuleStats;
  advanced: AdvancedStats;
  stadiumMap: StadiumMapResult;
  capsules: Capsule[];
  favoriteTeam?: string | null;
  followingCount?: number;
};

function periodLabel(scope: WrappedScope): string {
  return scope === 'all' ? 'tu diario' : String(scope);
}

function buildSummary(input: InsightsInput): Insight {
  const { name, scope, stats, advanced, stadiumMap } = input;
  const period = periodLabel(scope);
  const bits: string[] = [];

  bits.push(
    `${name}, en ${period} has vivido ${stats.totalMatches} partido${stats.totalMatches === 1 ? '' : 's'}`,
  );

  if (stats.averageRating != null) {
    bits.push(`con una media de ${formatRating(stats.averageRating)}★`);
  }

  if (stats.topTeam) {
    bits.push(`El hilo conductor es ${stats.topTeam.name} (${stats.topTeam.count} apariciones)`);
  }

  if (stats.peakMonth) {
    bits.push(
      `Tu mes más intenso fue ${MONTH_NAMES_ES[stats.peakMonth.month - 1]} (${stats.peakMonth.count})`,
    );
  }

  if (stats.topWatchContext) {
    bits.push(`Lo ves sobre todo desde ${stats.topWatchContext.name.toLowerCase()}`);
  }

  if (stadiumMap.favorite) {
    const top = stadiumMap.favorite;
    bits.push(
      `Tu estadio es ${top.stadium.name} (${top.visits} visita${top.visits === 1 ? '' : 's'})`,
    );
  } else if (stats.stadiumVisits === 0 && stats.totalMatches >= 3) {
    bits.push('Todavía no has marcado ningún partido en estadio');
  }

  if (advanced.topRivalries[0]) {
    const r = advanced.topRivalries[0];
    bits.push(`La rivalidad que más repites es ${r.teamA}–${r.teamB} (${r.count}×)`);
  }

  const body = `${bits[0]}.${bits.slice(1).map((b) => ` ${b}.`).join('')}`.replace(/\.\./g, '.');

  return {
    id: 'summary',
    kind: 'summary',
    title: scope === 'all' ? 'Tu resumen Ninety' : `Tu Wrapped ${scope}`,
    body,
  };
}

function buildMatchRecommendation(input: InsightsInput): Insight | null {
  const team = input.stats.topTeam?.name ?? input.favoriteTeam?.trim();
  if (!team) return null;

  const competition = input.stats.topCompetition?.name;
  const body = competition
    ? `Sigues de cerca a ${team}. Busca su próximo partido en ${competition} y guárdalo en el diario.`
    : `Sigues de cerca a ${team}. Busca su próximo partido y añade una Capsule.`;

  return {
    id: 'match-rec',
    kind: 'match',
    title: 'Próximo partido a guardar',
    body,
    href: '/search',
    hrefLabel: `Buscar ${team}`,
  };
}

function buildPeopleRecommendation(input: InsightsInput): Insight | null {
  const following = input.followingCount ?? 0;
  const team = input.favoriteTeam?.trim() || input.stats.topTeam?.name;
  if (!team) {
    if (following === 0) {
      return {
        id: 'people-rec',
        kind: 'people',
        title: 'Gente con tu gusto',
        body: 'Sigue aficionados para llenar el feed de Capsules que te importan.',
        href: '/search?tab=people',
        hrefLabel: 'Buscar aficionados',
      };
    }
    return null;
  }

  const teamHref = teamPath(team);

  if (following === 0) {
    return {
      id: 'people-rec',
      kind: 'people',
      title: 'Aficionados de tu equipo',
      body: `Descubre perfiles que también viven ${team}.`,
      href: teamHref,
      hrefLabel: `Fans de ${team}`,
    };
  }

  return {
    id: 'people-rec',
    kind: 'people',
    title: 'Amplía tu círculo',
    body: `Ya sigues a ${following} aficionado${following === 1 ? '' : 's'}. Explora más perfiles ligados a ${team}.`,
    href: teamHref,
    hrefLabel: `Fans de ${team}`,
  };
}

function buildTip(input: InsightsInput): Insight | null {
  if (input.advanced.ratedShare < 0.4 && input.stats.totalMatches >= 3) {
    return {
      id: 'tip-rate',
      kind: 'tip',
      title: 'Consejo del diario',
      body: 'Valora más partidos: con estrellas el Wrapped y las rivalidades ganan sentido.',
      href: '/capsules',
      hrefLabel: 'Ver mi diario',
    };
  }

  if (input.stats.stadiumVisits === 0 && input.stats.totalMatches >= 2) {
    return {
      id: 'tip-stadium',
      kind: 'tip',
      title: 'Consejo del diario',
      body: 'Si lo viviste en la grada, márcalo como Estadio: alimenta el mapa y los logros.',
      href: '/home?view=wrapped#stadium-map',
      hrefLabel: 'Ver mapa',
    };
  }

  if (input.stats.notesCount === 0 && input.stats.totalMatches >= 3) {
    return {
      id: 'tip-notes',
      kind: 'tip',
      title: 'Consejo del diario',
      body: 'Una nota corta convierte un resultado en un recuerdo. Escribe cómo lo viviste.',
      href: '/capsules',
      hrefLabel: 'Abrir diario',
    };
  }

  if (input.stadiumMap.favorite) {
    return {
      id: 'tip-favorite-stadium',
      kind: 'tip',
      title: 'Tu estadio',
      body: `${input.stadiumMap.favorite.stadium.name} lidera tu mapa con ${input.stadiumMap.favorite.visits} visita${input.stadiumMap.favorite.visits === 1 ? '' : 's'}. Repasa las Capsules en la grada.`,
      href: '/capsules?context=stadium',
      hrefLabel: 'Diario · estadio',
    };
  }

  if (input.stadiumMap.unmatchedStadiumCount > 0) {
    return {
      id: 'tip-map',
      kind: 'tip',
      title: 'Mapa en crecimiento',
      body: `Hay ${input.stadiumMap.unmatchedStadiumCount} visita${input.stadiumMap.unmatchedStadiumCount === 1 ? '' : 's'} sin sede en el catálogo. Seguimos ampliando el mapa.`,
      href: '/home?view=wrapped#stadium-map',
      hrefLabel: 'Ver mapa',
    };
  }

  return null;
}

/**
 * Insights heurísticos on-device a partir de stats/capsules (sin API de LLM).
 */
export function computeInsights(input: InsightsInput): Insight[] {
  if (input.stats.totalMatches === 0) return [];

  const insights: Insight[] = [buildSummary(input)];

  const match = buildMatchRecommendation(input);
  if (match) insights.push(match);

  const people = buildPeopleRecommendation(input);
  if (people) insights.push(people);

  const tip = buildTip(input);
  if (tip) insights.push(tip);

  return insights;
}
