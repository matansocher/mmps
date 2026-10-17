import { COMPETITION_IDS_MAP } from '@services/scores-365';
import type { DashboardEventType } from '@shared/coach';

export const DASHBOARD_EVENT_TYPES: readonly DashboardEventType[] = ['goal', 'redCard', 'yellowCard', 'missedPenalty', 'var', 'woodwork', 'substitution'];

export const DEFAULT_EVENT_TYPES: DashboardEventType[] = ['goal', 'redCard', 'missedPenalty', 'var'];

export const DEFAULT_COMPETITION_IDS: number[] = [
  COMPETITION_IDS_MAP.LIGAT_HAAL,
  COMPETITION_IDS_MAP.CHAMPIONS_LEAGUE,
  COMPETITION_IDS_MAP.EUROPA_LEAGUE,
  COMPETITION_IDS_MAP.CONFERENCE_LEAGUE,
  COMPETITION_IDS_MAP.PREMIER_LEAGUE,
  COMPETITION_IDS_MAP.LA_LIGA,
  COMPETITION_IDS_MAP.SERIE_A,
  COMPETITION_IDS_MAP.BUNDESLIGA,
];

export const MAX_FAVORITE_TEAMS = 30;

// The server caches live 365Scores data for LIVE_DATA_TTL_SEC, so refreshing faster than that returns nothing new.
export const LIVE_DATA_TTL_SEC = 15;
export const MIN_REFRESH_INTERVAL_SEC = LIVE_DATA_TTL_SEC;
export const MAX_REFRESH_INTERVAL_SEC = 300;
export const DEFAULT_REFRESH_INTERVAL_SEC = 30;

export const COMPETITION_NAMES: Readonly<Record<number, string>> = {
  [COMPETITION_IDS_MAP.LIGAT_HAAL]: 'Ligat HaAl',
  [COMPETITION_IDS_MAP.ISR_FA_CUP]: 'Israel State Cup',
  [COMPETITION_IDS_MAP.TOTO_CUP]: 'Toto Cup',
  [COMPETITION_IDS_MAP.CHAMPIONS_LEAGUE]: 'Champions League',
  [COMPETITION_IDS_MAP.EUROPA_LEAGUE]: 'Europa League',
  [COMPETITION_IDS_MAP.CONFERENCE_LEAGUE]: 'Conference League',
  [COMPETITION_IDS_MAP.PREMIER_LEAGUE]: 'Premier League',
  [COMPETITION_IDS_MAP.FA_CUP]: 'FA Cup',
  [COMPETITION_IDS_MAP.LA_LIGA]: 'LaLiga',
  [COMPETITION_IDS_MAP.COPA_DEL_REY]: 'Copa del Rey',
  [COMPETITION_IDS_MAP.BUNDESLIGA]: 'Bundesliga',
  [COMPETITION_IDS_MAP.BUNDESLIGA_CUP]: 'DFB Pokal',
  [COMPETITION_IDS_MAP.SERIE_A]: 'Serie A',
  [COMPETITION_IDS_MAP.SERIE_A_CUP]: 'Coppa Italia',
  [COMPETITION_IDS_MAP.WORLD_CUP]: 'World Cup',
  [COMPETITION_IDS_MAP.WORLD_CUP_QUAL]: 'World Cup Qualifiers',
  [COMPETITION_IDS_MAP.EURO]: 'Euro',
  [COMPETITION_IDS_MAP.EURO_QUAL]: 'Euro Qualifiers',
  [COMPETITION_IDS_MAP.NATIONS_LEAGUE]: 'Nations League',
  [COMPETITION_IDS_MAP.CLUB_WORLD_CUP]: 'Club World Cup',
};
