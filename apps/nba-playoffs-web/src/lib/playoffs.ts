import type { FlatSeries, League, Playoffs, Round } from '../types';
import { LEAGUES as DATA } from '../data/playoffs.generated';
import { leagueConfig } from './leagues';

export function seasonsFor(league: League): readonly Playoffs[] {
  return DATA[league];
}

export function seasonByYear(league: League, year: number): Playoffs | undefined {
  return DATA[league].find((s) => s.season === year);
}

export function firstSeason(league: League): number {
  return DATA[league][0].season;
}

export function lastSeason(league: League): number {
  return DATA[league][DATA[league].length - 1].season;
}

// Normalise a Playoffs record's league string ("NBA" | "UCL") to its id.
export function leagueOf(season: Playoffs): League {
  return season.league.toUpperCase() === 'UCL' ? 'ucl' : 'nba';
}

export function roundOrderFor(league: League): readonly string[] {
  return leagueConfig(league).roundOrder;
}

export function roundWeightFor(league: League, round: string): number {
  return leagueConfig(league).weights[round] ?? 1;
}

// Flatten one season's series in canonical play order (round by round, East before West).
export function flattenSeason(season: Playoffs): FlatSeries[] {
  const league = leagueOf(season);
  const out: FlatSeries[] = [];
  for (const roundName of roundOrderFor(league)) {
    const rounds = season.rounds.filter((r) => r.round === roundName);
    // East first, then West; null conference (finals / football) last.
    rounds.sort((a, b) => confRank(a) - confRank(b));
    for (const r of rounds) {
      for (const s of r.series) {
        out.push({
          season: season.season,
          league,
          round: r.round,
          conference: r.conference,
          higherSeed: s.higherSeed,
          lowerSeed: s.lowerSeed,
          winner: s.winner,
          result: s.result,
        });
      }
    }
  }
  return out;
}

function confRank(r: Round): number {
  if (r.conference === 'Eastern') return 0;
  if (r.conference === 'Western') return 1;
  return 2;
}
