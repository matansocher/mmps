import { COMPETITION_IDS_MAP, ENGLISH_LANGUAGE_ID, LANGUAGE_ID } from '@services/scores-365';
import type { DashboardEventType, DashboardLanguage } from '@shared/coach';

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

export const LIVE_DATA_TTL_SEC = 15;

export const DASHBOARD_LANGUAGES: readonly DashboardLanguage[] = ['he', 'en'];
export const DEFAULT_LANGUAGE: DashboardLanguage = 'he';
export const LANGUAGE_IDS: Readonly<Record<DashboardLanguage, number>> = { he: LANGUAGE_ID, en: ENGLISH_LANGUAGE_ID };

const COMPETITION_NAMES_EN: Readonly<Record<number, string>> = {
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

const COMPETITION_NAMES_HE: Readonly<Record<number, string>> = {
  [COMPETITION_IDS_MAP.LIGAT_HAAL]: 'ליגת העל',
  [COMPETITION_IDS_MAP.ISR_FA_CUP]: 'גביע המדינה',
  [COMPETITION_IDS_MAP.TOTO_CUP]: 'גביע הטוטו',
  [COMPETITION_IDS_MAP.CHAMPIONS_LEAGUE]: 'ליגת האלופות',
  [COMPETITION_IDS_MAP.EUROPA_LEAGUE]: 'הליגה האירופית',
  [COMPETITION_IDS_MAP.CONFERENCE_LEAGUE]: 'הקונפרנס ליג',
  [COMPETITION_IDS_MAP.PREMIER_LEAGUE]: 'פרמייר ליג',
  [COMPETITION_IDS_MAP.FA_CUP]: 'הגביע האנגלי',
  [COMPETITION_IDS_MAP.LA_LIGA]: 'לה ליגה',
  [COMPETITION_IDS_MAP.COPA_DEL_REY]: 'גביע המלך',
  [COMPETITION_IDS_MAP.BUNDESLIGA]: 'בונדסליגה',
  [COMPETITION_IDS_MAP.BUNDESLIGA_CUP]: 'גביע גרמניה',
  [COMPETITION_IDS_MAP.SERIE_A]: "סרייה א'",
  [COMPETITION_IDS_MAP.SERIE_A_CUP]: 'גביע איטליה',
  [COMPETITION_IDS_MAP.WORLD_CUP]: 'מונדיאל',
  [COMPETITION_IDS_MAP.WORLD_CUP_QUAL]: 'מוקדמות המונדיאל',
  [COMPETITION_IDS_MAP.EURO]: 'יורו',
  [COMPETITION_IDS_MAP.EURO_QUAL]: 'מוקדמות היורו',
  [COMPETITION_IDS_MAP.NATIONS_LEAGUE]: 'ליגת האומות',
  [COMPETITION_IDS_MAP.CLUB_WORLD_CUP]: 'מונדיאל הקבוצות',
};

export const COMPETITION_NAMES: Readonly<Record<DashboardLanguage, Readonly<Record<number, string>>>> = { en: COMPETITION_NAMES_EN, he: COMPETITION_NAMES_HE };

export const LINEUPS_CONFIRMED_STATUS = 3;

// Games per team in a season, for leagues with a plain double round robin. Titles and relegation are only declared mathematically for these.
export const SEASON_GAMES: Readonly<Record<number, number>> = {
  [COMPETITION_IDS_MAP.PREMIER_LEAGUE]: 38,
  [COMPETITION_IDS_MAP.LA_LIGA]: 38,
  [COMPETITION_IDS_MAP.SERIE_A]: 38,
  [COMPETITION_IDS_MAP.BUNDESLIGA]: 34,
};
