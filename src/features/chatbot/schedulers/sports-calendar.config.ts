import { COMPETITION_IDS_MAP } from '@services/scores-365';

export const SPORTS_CALENDAR_SOURCE = 'chatbot-sports-calendar';
export const SPORTS_CALENDAR_EVENT_DURATION_HOURS = 2;

export const FAVORITE_TEAM_IDS = new Set([131, 132, 104, 108, 105, 110, 106, 331, 562]);

export const ISRAELI_DERBY_TEAM_IDS = new Set([566, 567, 562]); // Maccabi Tel Aviv, Hapoel Tel Aviv, Maccabi Haifa

export const SPORTS_CALENDAR_COMPETITION_IDS = {
  israeliPremierLeague: COMPETITION_IDS_MAP.LIGAT_HAAL,
  championsLeague: COMPETITION_IDS_MAP.CHAMPIONS_LEAGUE,
  worldCup: COMPETITION_IDS_MAP.WORLD_CUP,
} as const;
