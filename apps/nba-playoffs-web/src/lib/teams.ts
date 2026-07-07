export type TeamStyle = {
  readonly abbr: string;
  readonly primary: string;
  readonly secondary: string;
  readonly text: string; // best contrast text color on primary
};

const W = '#FFFFFF';

// Keyed by the exact full team name used in the playoff data (includes historical franchises).
export const TEAM_STYLES: Record<string, TeamStyle> = {
  'Atlanta Hawks': { abbr: 'ATL', primary: '#E03A3E', secondary: '#C1D32F', text: W },
  'Boston Celtics': { abbr: 'BOS', primary: '#007A33', secondary: '#BA9653', text: W },
  'Brooklyn Nets': { abbr: 'BKN', primary: '#000000', secondary: '#FFFFFF', text: W },
  'Charlotte Bobcats': { abbr: 'CHA', primary: '#F26432', secondary: '#2A5B83', text: W },
  'Charlotte Hornets': { abbr: 'CHA', primary: '#1D1160', secondary: '#00788C', text: W },
  'Chicago Bulls': { abbr: 'CHI', primary: '#CE1141', secondary: '#000000', text: W },
  'Cleveland Cavaliers': { abbr: 'CLE', primary: '#860038', secondary: '#FDBB30', text: W },
  'Dallas Mavericks': { abbr: 'DAL', primary: '#00538C', secondary: '#B8C4CA', text: W },
  'Denver Nuggets': { abbr: 'DEN', primary: '#0E2240', secondary: '#FEC524', text: W },
  'Detroit Pistons': { abbr: 'DET', primary: '#C8102E', secondary: '#1D42BA', text: W },
  'Golden State Warriors': { abbr: 'GSW', primary: '#1D428A', secondary: '#FFC72C', text: W },
  'Houston Rockets': { abbr: 'HOU', primary: '#CE1141', secondary: '#000000', text: W },
  'Indiana Pacers': { abbr: 'IND', primary: '#002D62', secondary: '#FDBB30', text: W },
  'Kansas City Kings': { abbr: 'KCK', primary: '#5A2D81', secondary: '#63727A', text: W },
  'Los Angeles Clippers': { abbr: 'LAC', primary: '#C8102E', secondary: '#1D428A', text: W },
  'Los Angeles Lakers': { abbr: 'LAL', primary: '#552583', secondary: '#FDB927', text: W },
  'Memphis Grizzlies': { abbr: 'MEM', primary: '#5D76A9', secondary: '#12173F', text: W },
  'Miami Heat': { abbr: 'MIA', primary: '#98002E', secondary: '#F9A01B', text: W },
  'Milwaukee Bucks': { abbr: 'MIL', primary: '#00471B', secondary: '#EEE1C6', text: W },
  'Minnesota Timberwolves': { abbr: 'MIN', primary: '#0C2340', secondary: '#236192', text: W },
  'New Jersey Nets': { abbr: 'NJN', primary: '#002A60', secondary: '#CD1041', text: W },
  'New Orleans Hornets': { abbr: 'NOH', primary: '#0A2240', secondary: '#1DA79E', text: W },
  'New Orleans Pelicans': { abbr: 'NOP', primary: '#0C2340', secondary: '#C8102E', text: W },
  'New York Knicks': { abbr: 'NYK', primary: '#006BB6', secondary: '#F58426', text: W },
  'Oklahoma City Thunder': { abbr: 'OKC', primary: '#007AC1', secondary: '#EF3B24', text: W },
  'Orlando Magic': { abbr: 'ORL', primary: '#0077C0', secondary: '#C4CED4', text: W },
  'Philadelphia 76ers': { abbr: 'PHI', primary: '#006BB6', secondary: '#ED174C', text: W },
  'Phoenix Suns': { abbr: 'PHX', primary: '#1D1160', secondary: '#E56020', text: W },
  'Portland Trail Blazers': { abbr: 'POR', primary: '#E03A3E', secondary: '#000000', text: W },
  'Sacramento Kings': { abbr: 'SAC', primary: '#5A2D81', secondary: '#63727A', text: W },
  'San Antonio Spurs': { abbr: 'SAS', primary: '#000000', secondary: '#C4CED4', text: W },
  'Seattle SuperSonics': { abbr: 'SEA', primary: '#006B3C', secondary: '#FFC72C', text: W },
  'Toronto Raptors': { abbr: 'TOR', primary: '#CE1141', secondary: '#000000', text: W },
  'Utah Jazz': { abbr: 'UTA', primary: '#002B5C', secondary: '#00471B', text: W },
  'Washington Bullets': { abbr: 'WSB', primary: '#002B5C', secondary: '#E31837', text: W },
  'Washington Wizards': { abbr: 'WAS', primary: '#002B5C', secondary: '#E31837', text: W },
};

const FALLBACK: TeamStyle = { abbr: '???', primary: '#33404F', secondary: '#5F6B7C', text: W };

export function teamStyle(team: string): TeamStyle {
  return TEAM_STYLES[team] ?? { ...FALLBACK, abbr: team.slice(0, 3).toUpperCase() };
}

// ESPN slug overrides where the public CDN uses a non-standard code.
const ESPN_SLUG: Record<string, string> = {
  'New Orleans Pelicans': 'no',
  'Utah Jazz': 'utah',
};

// Franchises the CDN has no correct historical logo for — always render the crest instead.
const CREST_ONLY = new Set<string>([
  'Charlotte Bobcats',
  'Kansas City Kings',
  'New Orleans Hornets',
  'Seattle SuperSonics',
  'Washington Bullets',
]);

// Runtime logo URL from a public CDN, or null to signal "use the colored crest".
export function logoUrl(team: string): string | null {
  if (CREST_ONLY.has(team)) return null;
  const style = TEAM_STYLES[team];
  if (!style) return null;
  const slug = ESPN_SLUG[team] ?? style.abbr.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nba/500/${slug}.png`;
}

// Short display: drop the city, keep the nickname (e.g. "Los Angeles Lakers" -> "Lakers").
export function shortName(team: string): string {
  const parts = team.split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : team;
}
