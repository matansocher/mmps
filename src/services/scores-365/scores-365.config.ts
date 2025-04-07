export const SCORES_365_API_URL = 'https://webws.365scores.com/web';

export const APP_TYPE_ID = 5;
export const LANGUAGE_ID = 2;
export const COUNTRY_ID = 6;

export const COMPETITION_IDS_MAP = {
  LIGAT_HAAL: 42,
  ISR_FA_CUP: 49,
  TOTO_CUP: 546,
  CHAMPIONS_LEAGUE: 572,
  EUROPA_LEAGUE: 573,
  CONFERENCE_LEAGUE: 7685,
  PREMIER_LEAGUE: 7,
  FA_CUP: 8,
  LA_LIGA: 11,
  COPA_DEL_REY: 13,
  BUNDESLIGA: 25,
  BUNDESLIGA_CUP: 28,
  SERIE_A: 17,
  SERIE_A_CUP: 20,
  WORLD_CUP: 5930,
  WORLD_CUP_QUAL: 5421,
  EURO: 6316,
  EURO_QUAL: 6071,
  NATIONS_LEAGUE: 7016,
};

export const COMPETITIONS = [
  { id: COMPETITION_IDS_MAP.LIGAT_HAAL, icon: '🇮🇱', hasTable: true },
  { id: COMPETITION_IDS_MAP.ISR_FA_CUP, icon: '🇮🇱' },
  { id: COMPETITION_IDS_MAP.CHAMPIONS_LEAGUE, icon: '🏆', hasTable: true },
  { id: COMPETITION_IDS_MAP.EUROPA_LEAGUE, icon: '🇪🇺', hasTable: true },
  { id: COMPETITION_IDS_MAP.CONFERENCE_LEAGUE, icon: '🇪🇺', hasTable: true },
  { id: COMPETITION_IDS_MAP.PREMIER_LEAGUE, icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', hasTable: true },
  { id: COMPETITION_IDS_MAP.FA_CUP, icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: COMPETITION_IDS_MAP.LA_LIGA, icon: '🇪🇸', hasTable: true },
  { id: COMPETITION_IDS_MAP.COPA_DEL_REY, icon: '🇪🇸' },
  { id: COMPETITION_IDS_MAP.SERIE_A, icon: '🇮🇹', hasTable: true },
  { id: COMPETITION_IDS_MAP.SERIE_A_CUP, icon: '🇮🇹' },
  { id: COMPETITION_IDS_MAP.BUNDESLIGA, icon: '🇩🇪', hasTable: true },
  { id: COMPETITION_IDS_MAP.BUNDESLIGA_CUP, icon: '🇩🇪' },
  { id: COMPETITION_IDS_MAP.WORLD_CUP, icon: '🌍' },
  { id: COMPETITION_IDS_MAP.WORLD_CUP_QUAL, icon: '🌍' },
  { id: COMPETITION_IDS_MAP.EURO, icon: '🇪🇺' },
  { id: COMPETITION_IDS_MAP.EURO_QUAL, icon: '🇪🇺' },
  { id: COMPETITION_IDS_MAP.NATIONS_LEAGUE, icon: '🇪🇺' },
];
