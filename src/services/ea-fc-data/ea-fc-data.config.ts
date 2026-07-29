export const EA_FC_DATASET_URL = 'https://raw.githubusercontent.com/ismailoksuz/EAFC26-DataHub/main/data/players.csv';

export const SOFIFA_CDN_BASE = 'https://cdn.sofifa.net';

export const EA_FC_FIFA_VERSION = '26';

// Exact league_name strings as they appear in the EA FC 26 dataset (verified).
export const TOP_5_LEAGUE_NAMES = ['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1'] as const;

export type Top5LeagueName = (typeof TOP_5_LEAGUE_NAMES)[number];

// league_name -> metadata (league_id from dataset, arrives as float e.g. "13.0").
export const TOP_5_LEAGUES: Record<Top5LeagueName, { readonly leagueId: number; readonly country: string; readonly icon: string }> = {
  'Premier League': { leagueId: 13, country: 'England', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'La Liga': { leagueId: 53, country: 'Spain', icon: '🇪🇸' },
  Bundesliga: { leagueId: 19, country: 'Germany', icon: '🇩🇪' },
  'Serie A': { leagueId: 31, country: 'Italy', icon: '🇮🇹' },
  'Ligue 1': { leagueId: 16, country: 'France', icon: '🇫🇷' },
};

export const TOP_5_LEAGUE_NAME_SET: ReadonlySet<string> = new Set(TOP_5_LEAGUE_NAMES);

// The dataset's `league_name` is NOT unique — EA reuses names across countries
// (e.g. Austrian "Bundesliga", Ecuadorian "Serie A", Ukrainian clubs tagged
// "Premier League"). The numeric `league_id` IS unique per real league, so we
// filter on it. Map league_id -> canonical top-5 league name.
export const TOP_5_LEAGUE_ID_TO_NAME: ReadonlyMap<number, Top5LeagueName> = new Map([
  [13, 'Premier League'],
  [53, 'La Liga'],
  [19, 'Bundesliga'],
  [31, 'Serie A'],
  [16, 'Ligue 1'],
]);
