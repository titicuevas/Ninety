export interface PublicProfileStats {
  totalMatches: number;
  averageRating: number | null;
  topTeam: { name: string; count: number } | null;
  topCompetition: { name: string; count: number } | null;
  peakMonth: { month: number; label: string; count: number } | null;
  fiveStarCount: number;
  topWatchContext: { name: string; count: number } | null;
  stadiumVisits: number;
  photosCount: number;
  photoCollageUrls: string[];
  matchesByMonth: number[];
  bestRated: {
    home_team_name: string;
    away_team_name: string;
    rating: number;
  } | null;
}
