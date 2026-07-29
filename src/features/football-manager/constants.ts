export const FOOTBALL_MANAGER_DB_NAME = 'FootballManager';

// Reference data (imported once from EA FC 26 dataset).
export const LEAGUES_COLLECTION = 'leagues';
export const TEAMS_COLLECTION = 'teams';
export const PLAYERS_COLLECTION = 'players';

// Per-user game state.
export const USERS_COLLECTION = 'users';
export const CAREERS_COLLECTION = 'careers';
export const FIXTURES_COLLECTION = 'fixtures';
export const MATCH_RESULTS_COLLECTION = 'matchResults';
export const GOAL_SCORERS_COLLECTION = 'goalScorers';
export const SEASON_ARCHIVES_COLLECTION = 'seasonArchives';

// Transfers (Phase 3).
export const CAREER_PLAYERS_COLLECTION = 'careerPlayers'; // per-career player deltas (moves)
export const CAREER_TEAMS_COLLECTION = 'careerTeams'; // per-career club budget + window signings
export const TRANSFER_BIDS_COLLECTION = 'transferBids'; // user -> AI outgoing bids
export const TRANSFER_OFFERS_COLLECTION = 'transferOffers'; // AI -> user incoming offers
export const TRANSFER_NEWS_COLLECTION = 'transferNews'; // completed-deal news feed

// Live match (Phase 4).
export const LIVE_MATCHES_COLLECTION = 'liveMatches'; // in-progress user match state

// Progression (Phase 5).
export const CAREER_PLAYER_STATS_COLLECTION = 'careerPlayerStats'; // per-career player form/morale/fitness/aging
export const CAREER_LINEUPS_COLLECTION = 'careerLineups'; // per-career persistent starting XI

// Max substitutions a manager can make in a single live match.
export const MAX_SUBS_PER_MATCH = 3;

// Auth / session.
export const FM_SESSION_COOKIE = 'fm_session';
export const FM_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Transfer windows, expressed as inclusive matchday ranges within a season.
// Summer = start of season; Winter maps "January" to mid-season.
export const TRANSFER_WINDOWS: readonly { readonly name: 'summer' | 'winter'; readonly from: number; readonly to: number }[] = [
  { name: 'summer', from: 1, to: 4 },
  { name: 'winter', from: 19, to: 22 },
];

// A club may complete at most this many incoming signings per open window.
export const MAX_SIGNINGS_PER_WINDOW = 4;

// Selling a player yields this fraction of their market value (instant sales n/a — all
// sales go through bids, but this bounds acceptable AI bids around value).
export const SALE_VALUE_FLOOR = 0.85; // AI accepts bids >= 85% of value
export const SALE_VALUE_COUNTER = 1.1; // AI counters at 110% of value when bid is close
