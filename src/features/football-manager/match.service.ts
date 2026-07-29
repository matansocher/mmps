import { resultFromTimeline, simulateTimeline, type MatchDecision, type MatchTimeline, type SimResult, type SimScorerInput, type SimTeamInput } from './engine';
import type { FixtureDocument, PlayerDocument, TeamDocument } from './types';

const ATTACKING_POSITIONS = new Set(['ST', 'CF', 'LW', 'RW', 'LM', 'RM', 'CAM', 'CM', 'LF', 'RF']);

function isAttacker(positions: readonly string[]): boolean {
  return positions.some((p) => ATTACKING_POSITIONS.has(p));
}

// Builds a sim input for a team from its top players (used as candidate scorers).
// `overallOverride` lets the caller pass an effective overall computed from the
// post-transfer squad; when omitted the team's static catalog overall is used.
export function buildTeamInput(team: TeamDocument, players: readonly PlayerDocument[], overallOverride?: number): SimTeamInput {
  const scorers: SimScorerInput[] = players
    .slice(0, 18)
    .map((p) => ({ playerId: p.eaPlayerId, name: p.shortName, overall: p.overall, isAttacker: isAttacker(p.positions) }));
  return { teamId: team.eaTeamId, overall: overallOverride ?? team.overall, scorers };
}

// Deterministic seed for a fixture, so instant-result and 2D live playback of
// the same match agree.
export function fixtureSeed(fixture: FixtureDocument): string {
  return `${fixture.careerId}:${fixture.seasonNumber}:${fixture.matchday}:${fixture.homeTeamId}:${fixture.awayTeamId}`;
}

// Simulates one fixture deterministically. The result is derived from the
// minute-by-minute timeline so the number/attribution of goals matches what a
// user would see if they watched the same match live.
export function simulateFixture(fixture: FixtureDocument, home: SimTeamInput, away: SimTeamInput): SimResult {
  return resultFromTimeline(home, away, fixtureSeed(fixture));
}

// Full timeline for a fixture, optionally reacting to in-match decisions
// (mentality / subs). Used by the live match view.
export function timelineForFixture(fixture: FixtureDocument, home: SimTeamInput, away: SimTeamInput, decisions: readonly MatchDecision[] = []): MatchTimeline {
  return simulateTimeline(home, away, fixtureSeed(fixture), decisions);
}
