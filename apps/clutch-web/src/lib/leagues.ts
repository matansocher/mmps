import type { League } from '../types';

export type LeagueConfig = {
  readonly id: League;
  readonly name: string; // full name
  readonly short: string; // NBA / UCL
  readonly emoji: string;
  readonly playName: string; // used on intro screens
  readonly roundOrder: readonly string[]; // first → final
  readonly weights: Readonly<Record<string, number>>;
  readonly finalRound: string;
  readonly finalLabel: string; // short label shown on the final card
  readonly semiLabel: string; // short label for the side-root (semi) round card
  readonly sideLabels: readonly [string, string]; // left/right bracket sides
  readonly tie: string; // word for a matchup: "series" | "tie"
  readonly accent: 'hoop' | 'flame'; // theme accent used in league UIs
};

export const LEAGUES: Readonly<Record<League, LeagueConfig>> = {
  nba: {
    id: 'nba',
    name: 'NBA Playoffs',
    short: 'NBA',
    emoji: '🏀',
    playName: 'NBA Playoffs',
    roundOrder: ['First Round', 'Conference Semifinals', 'Conference Finals', 'NBA Finals'],
    weights: { 'First Round': 1, 'Conference Semifinals': 2, 'Conference Finals': 3, 'NBA Finals': 5 },
    finalRound: 'NBA Finals',
    finalLabel: '🏆 Finals',
    semiLabel: 'Conf Finals',
    sideLabels: ['East', 'West'],
    tie: 'series',
    accent: 'hoop',
  },
  ucl: {
    id: 'ucl',
    name: 'Champions League',
    short: 'UCL',
    emoji: '⚽️',
    playName: 'UCL Knockouts',
    roundOrder: ['Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'],
    weights: { 'Round of 16': 1, 'Quarter-finals': 2, 'Semi-finals': 3, Final: 5 },
    finalRound: 'Final',
    finalLabel: '🏆 Final',
    semiLabel: 'Semis',
    sideLabels: ['Left', 'Right'],
    tie: 'tie',
    accent: 'hoop',
  },
  wc: {
    id: 'wc',
    name: 'World Cup',
    short: 'WC',
    emoji: '🌍',
    playName: 'World Cup Knockouts',
    roundOrder: ['Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'],
    weights: { 'Round of 16': 1, 'Quarter-finals': 2, 'Semi-finals': 3, Final: 5 },
    finalRound: 'Final',
    finalLabel: '🏆 Final',
    semiLabel: 'Semis',
    sideLabels: ['Left', 'Right'],
    tie: 'tie',
    accent: 'hoop',
  },
  euro: {
    id: 'euro',
    name: 'Euros',
    short: 'EURO',
    emoji: '🇪🇺',
    playName: 'Euro Knockouts',
    roundOrder: ['Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'],
    weights: { 'Round of 16': 1, 'Quarter-finals': 2, 'Semi-finals': 3, Final: 5 },
    finalRound: 'Final',
    finalLabel: '🏆 Final',
    semiLabel: 'Semis',
    sideLabels: ['Left', 'Right'],
    tie: 'tie',
    accent: 'hoop',
  },
};

export function leagueConfig(league: League): LeagueConfig {
  return LEAGUES[league];
}

export function isLeague(value: string | undefined): value is League {
  return value === 'nba' || value === 'ucl' || value === 'wc' || value === 'euro';
}
