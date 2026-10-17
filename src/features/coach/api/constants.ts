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
export const MAX_FEED_ITEMS = 150;

// Used when the 365Scores competitions lookup is unavailable.
export const COMPETITION_FALLBACK_NAMES: Readonly<Record<number, string>> = {
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
  [COMPETITION_IDS_MAP.BUNDESLIGA_CUP]: 'הגביע הגרמני',
  [COMPETITION_IDS_MAP.SERIE_A]: "סרייה א'",
  [COMPETITION_IDS_MAP.SERIE_A_CUP]: 'הגביע האיטלקי',
  [COMPETITION_IDS_MAP.WORLD_CUP]: 'מונדיאל',
  [COMPETITION_IDS_MAP.WORLD_CUP_QUAL]: 'מוקדמות המונדיאל',
  [COMPETITION_IDS_MAP.EURO]: 'יורו',
  [COMPETITION_IDS_MAP.EURO_QUAL]: 'מוקדמות היורו',
  [COMPETITION_IDS_MAP.NATIONS_LEAGUE]: 'ליגת האומות',
  [COMPETITION_IDS_MAP.CLUB_WORLD_CUP]: 'מונדיאל הקבוצות',
};
