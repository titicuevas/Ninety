export interface PublicProfileStats {
  totalMatches: number;
  averageRating: number | null;
  topTeam: { name: string; count: number } | null;
  topCompetition: { name: string; count: number } | null;
  peakMonth: { month: number; label: string; count: number } | null;
  fiveStarCount: number;
  topWatchContext: { name: string; count: number } | null;
}
