import { computePublicProfileStats } from './publicProfileStats.js';
import { normalizeProfile, type ProfileRow } from './profileNormalize.js';

export const DEMO_PUBLIC_USERNAME = 'beta_ninety';

/** UUID estable solo para respuestas degradadas (no es el id real en Auth). */
const DEMO_FALLBACK_USER_ID = '00000000-0000-4000-8000-626574616e90';

const DEMO_PROFILE: ProfileRow = {
  id: DEMO_FALLBACK_USER_ID,
  username: DEMO_PUBLIC_USERNAME,
  display_name: 'Beta Ninety',
  avatar_url: null,
  favorite_team: 'Spain',
  country: 'ES',
  city: null,
  bio: 'Cuenta demo de Ninety — diario futbolero de ejemplo.',
  created_at: '2024-01-15T12:00:00.000Z',
  updated_at: '2024-01-15T12:00:00.000Z',
};

const DEMO_CAPSULES = [
  {
    id: 'demo-fallback-euro-final',
    user_id: DEMO_FALLBACK_USER_ID,
    match_id: 433_123,
    match_played_at: '2024-07-14T20:00:00.000Z',
    home_team_name: 'Spain',
    away_team_name: 'England',
    home_team_crest: 'https://crests.football-data.org/760.svg',
    away_team_crest: 'https://crests.football-data.org/770.svg',
    competition_name: 'European Championship',
    home_score: 2,
    away_score: 1,
    watched_at: '2024-07-14',
    rating: 5,
    note: 'Final de la Euro — con amigos en el bar del barrio. Lágrimas al final.',
    photo_urls: [] as string[],
    is_public: true,
    watch_context: 'pub' as const,
    created_at: '2024-07-14T22:00:00.000Z',
    updated_at: '2024-07-14T22:00:00.000Z',
  },
  {
    id: 'demo-fallback-clasico',
    user_id: DEMO_FALLBACK_USER_ID,
    match_id: 498_765,
    match_played_at: '2024-04-21T20:00:00.000Z',
    home_team_name: 'Real Madrid CF',
    away_team_name: 'FC Barcelona',
    home_team_crest: 'https://crests.football-data.org/86.svg',
    away_team_crest: 'https://crests.football-data.org/81.svg',
    competition_name: 'La Liga',
    home_score: 3,
    away_score: 2,
    watched_at: '2024-04-21',
    rating: 4,
    note: 'Clásico intenso. Vinicius decidió en el minuto 90.',
    photo_urls: [] as string[],
    is_public: true,
    watch_context: 'tv' as const,
    created_at: '2024-04-21T22:00:00.000Z',
    updated_at: '2024-04-21T22:00:00.000Z',
  },
  {
    id: 'demo-fallback-derbi',
    user_id: DEMO_FALLBACK_USER_ID,
    match_id: 512_001,
    match_played_at: '2024-02-25T18:30:00.000Z',
    home_team_name: 'Real Betis',
    away_team_name: 'Sevilla FC',
    home_team_crest: 'https://crests.football-data.org/90.svg',
    away_team_crest: 'https://crests.football-data.org/559.svg',
    competition_name: 'La Liga',
    home_score: 2,
    away_score: 2,
    watched_at: '2024-02-25',
    rating: 3,
    note: 'Derbi sevillano en el Villamarín. Ambiente espectacular.',
    photo_urls: [] as string[],
    is_public: true,
    watch_context: 'stadium' as const,
    created_at: '2024-02-25T20:00:00.000Z',
    updated_at: '2024-02-25T20:00:00.000Z',
  },
  {
    id: 'demo-fallback-anfield',
    user_id: DEMO_FALLBACK_USER_ID,
    match_id: 445_890,
    match_played_at: '2024-11-10T17:30:00.000Z',
    home_team_name: 'Liverpool FC',
    away_team_name: 'Manchester City FC',
    home_team_crest: 'https://crests.football-data.org/64.svg',
    away_team_crest: 'https://crests.football-data.org/65.svg',
    competition_name: 'Premier League',
    home_score: 1,
    away_score: 1,
    watched_at: '2024-11-10',
    rating: 5,
    note: 'Partidazo en Anfield. Salah y Haaland en estado de gracia.',
    photo_urls: [] as string[],
    is_public: true,
    watch_context: 'tv' as const,
    created_at: '2024-11-10T19:00:00.000Z',
    updated_at: '2024-11-10T19:00:00.000Z',
  },
  {
    id: 'demo-fallback-nations',
    user_id: DEMO_FALLBACK_USER_ID,
    match_id: 401_112,
    match_played_at: '2024-10-15T20:45:00.000Z',
    home_team_name: 'Spain',
    away_team_name: 'France',
    home_team_crest: 'https://crests.football-data.org/760.svg',
    away_team_crest: 'https://crests.football-data.org/773.svg',
    competition_name: 'UEFA Nations League',
    home_score: 2,
    away_score: 0,
    watched_at: '2024-10-15',
    rating: 4,
    note: 'Selección sólida en defensa. Oyarzabal cerró el partido.',
    photo_urls: [] as string[],
    is_public: true,
    watch_context: 'pub' as const,
    created_at: '2024-10-15T22:00:00.000Z',
    updated_at: '2024-10-15T22:00:00.000Z',
  },
] as const;

export function isDemoPublicUsername(username: string | undefined): boolean {
  return (username ?? '').trim().toLowerCase() === DEMO_PUBLIC_USERNAME;
}

/**
 * Respuesta pública de @beta_ninety cuando PostgREST no responde.
 * Misma narrativa que seed:demo — solo para degradación temporal.
 */
export function buildDemoPublicShowcasePayload(limit = 20, offset = 0) {
  const ordered = [...DEMO_CAPSULES].sort((a, b) => b.watched_at.localeCompare(a.watched_at));
  const page = ordered.slice(offset, offset + limit);
  const stats = computePublicProfileStats(
    ordered.map((c) => ({
      watched_at: c.watched_at,
      rating: c.rating,
      home_team_name: c.home_team_name,
      away_team_name: c.away_team_name,
      competition_name: c.competition_name,
      watch_context: c.watch_context,
      photo_urls: c.photo_urls,
    })),
  );
  const years = [...new Set(ordered.map((c) => Number(c.watched_at.slice(0, 4))))].sort(
    (a, b) => b - a,
  );

  return {
    profile: {
      ...normalizeProfile(DEMO_PROFILE),
      followers_count: 0,
      following_count: 0,
      followed_by_me: false,
      follows_me: false,
      muted_by_me: false,
      blocked_by_me: false,
    },
    capsules: page,
    total: ordered.length,
    stats,
    stats_by_year: { '2024': stats },
    years,
    tags: [] as string[],
    featured_collection: null,
    from_fallback: true as const,
  };
}
