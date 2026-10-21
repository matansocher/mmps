import { FINAL_REPLY_TOOL_NAME } from '../agent/structured-response';

export const WRITING_STATUS_LABEL = '✍️ Writing the answer';
export const DEFAULT_TOOL_STATUS_LABEL = '⚙️ Working on it';

// Internal tools that should never surface as a status line
const HIDDEN_STATUS_TOOLS: ReadonlySet<string> = new Set([FINAL_REPLY_TOOL_NAME]);

export const TOOL_STATUS_LABELS: Readonly<Record<string, string>> = {
  browse_url: '🌐 Reading the page',
  calendar: '📅 Checking your calendar',
  competition_matches: '⚽ Checking matches',
  competition_table: '🏆 Checking the standings',
  competitions_list: '🏆 Looking up competitions',
  contacts: '👥 Looking up contacts',
  earthquake_monitor: '🌍 Checking earthquakes',
  exercise_analytics: '📊 Crunching your workouts',
  exercise_tracker: '🏋️ Checking your workouts',
  game_price_watcher: '🎮 Checking game prices',
  game_releases: '🎮 Checking game releases',
  game_scores: '🎮 Checking game scores',
  github: '🐙 Checking GitHub',
  gmail: '📧 Checking your email',
  google_maps_place: '🗺️ Looking up the place',
  google_place_details: '🗺️ Getting place details',
  google_places: '🗺️ Searching places',
  hotel_watcher: '🏨 Checking hotels',
  israel_rail: '🚆 Checking trains',
  light_rail: '🚊 Checking the light rail',
  makavdia: '🏀 Checking Deni Avdija stats',
  match_prediction_data: '🔮 Analyzing the match',
  match_summary: '⚽ Getting the match summary',
  meetups: '🤝 Checking your meetups',
  polymarket: '📈 Checking Polymarket',
  rain_radar: '🌧️ Checking the rain radar',
  recipes: '🍳 Looking up recipes',
  smart_reminders: '⏰ Handling reminders',
  social: '📱 Checking social feeds',
  spotify: '🎵 Checking Spotify',
  spotify_podcast: '🎙️ Checking podcasts',
  top_matches_for_prediction: '⚽ Picking matches',
  weather: '🌤️ Checking the weather',
  web_search: '🔎 Searching the web',
  wolt_summary: '🛵 Checking Wolt',
  worldly_summary: '🌎 Checking Worldly stats',
};

// Returns undefined for tools that should stay invisible
export function getToolStatusLabel(toolName: string): string | undefined {
  if (HIDDEN_STATUS_TOOLS.has(toolName)) return undefined;
  return TOOL_STATUS_LABELS[toolName] ?? DEFAULT_TOOL_STATUS_LABEL;
}
