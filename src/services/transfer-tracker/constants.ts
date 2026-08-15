// transfertracker.ai is a React SPA backed by a public Supabase project; these are the
// same REST URL + publishable anon key the site ships in its browser bundle.
export const BASE_URL = 'https://wfyoaiqjtgvdbonzcsyw.supabase.co/rest/v1';
export const ANON_KEY = 'sb_publishable_mRM6knCYCEDsZdjmWdmyAg_MKBX582S';

// Europe's top-5 leagues (Supabase league ids). Serie A Brazil (648) is intentionally excluded.
export const TOP5_LEAGUE_IDS: readonly number[] = [
  8, // Premier League
  564, // La Liga
  384, // Serie A
  82, // Bundesliga
  301, // Ligue 1
];
