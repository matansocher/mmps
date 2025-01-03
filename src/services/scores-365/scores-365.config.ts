export const SCORES_365_API_URL = 'https://webws.365scores.com/web';

export const COMPETITION_IDS_MAP = {
  LIGAT_HAAL: 42,
  ISR_FA_CUP: 49,
  TOTO_CUP: 546,
  CHAMPIONS_LEAGUE: 572,
  EUROPA_LEAGUE: 573,
  PREMIER_LEAGUE: 7,
  FA_CUP: 8,
  LA_LIGA: 11,
  COPA_DEL_REY: 13,
  BUNDESLIGA: 25,
  SERIE_A: 17,
  WORLD_CUP: 5930,
  EURO: 6316,
};
export const COMPETITION_IDS = Object.values(COMPETITION_IDS_MAP);

export const COMPETITION_LOGOS_MAP = {
  [COMPETITION_IDS_MAP.LIGAT_HAAL]: '🇮🇱',
  [COMPETITION_IDS_MAP.ISR_FA_CUP]: '🇮🇱',
  [COMPETITION_IDS_MAP.CHAMPIONS_LEAGUE]: '🏆',
  [COMPETITION_IDS_MAP.EUROPA_LEAGUE]: '🇪🇺',
  [COMPETITION_IDS_MAP.PREMIER_LEAGUE]: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  [COMPETITION_IDS_MAP.FA_CUP]: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  [COMPETITION_IDS_MAP.LA_LIGA]: '🇪🇸',
  [COMPETITION_IDS_MAP.COPA_DEL_REY]: '🇪🇸',
  [COMPETITION_IDS_MAP.SERIE_A]: '🇮🇹',
  [COMPETITION_IDS_MAP.BUNDESLIGA]: '🇩🇪',
  // [COMPETITION_IDS_MAP.WORLD_CUP]: '🌍',
  // [COMPETITION_IDS_MAP.EURO]: '🇪🇺',
};
