import { getTeamById } from './mongo/reference.repository';
import { getEffectiveSquad } from './mongo/transfer.repository';
import { effectiveOverallFor, getLineup, getStatsMap, resolveMatchdaySquad } from './mongo/progression.repository';
import { buildProgressedTeamInput, buildUserTeamInput } from './squad.service';
import { timelineForFixture } from './match.service';
import type { MatchDecision, MatchTimeline, SideStats } from './engine';
import { DEFAULT_FORMATION, FULL_TIME_MINUTE, getFormation } from './engine';
import type { FixtureDocument, LiveMatchDecision, LiveMatchDocument, PlayerDocument } from './types';

export type LiveMatchView = {
  readonly minute: number;
  readonly finished: boolean;
  readonly homeTeamId: number;
  readonly awayTeamId: number;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly userSide: 'home' | 'away';
  readonly homeGoals: number; // score AS OF the current minute
  readonly awayGoals: number;
  readonly finalHomeGoals: number; // final score (for skip-to-end)
  readonly finalAwayGoals: number;
  readonly userMentality: 'defensive' | 'balanced' | 'attacking';
  readonly subsUsed: number;
  readonly subsRemaining: number;
  // Events revealed so far (minute <= cursor).
  readonly events: MatchTimeline['events'];
  // Ball frames revealed so far (minute <= cursor).
  readonly frames: MatchTimeline['frames'];
  // Player-position frames revealed so far (22 dots per minute).
  readonly playerFrames: MatchTimeline['playerFrames'];
  // Cumulative comparative stats as of the current minute.
  readonly stats: { readonly home: SideStats; readonly away: SideStats };
  // The manager's chosen formation.
  readonly formationId: string;
  // The decisions the manager has taken (for the timeline strip).
  readonly decisions: readonly LiveMatchDecision[];
};

// The user side's on-pitch XI (first 11 effective players) and bench (the rest,
// capped) so the client can present substitution choices.
export type LiveMatchSquads = {
  readonly onPitch: readonly { readonly playerId: number; readonly name: string; readonly overall: number; readonly positions: readonly string[] }[];
  readonly bench: readonly { readonly playerId: number; readonly name: string; readonly overall: number; readonly positions: readonly string[] }[];
};

const MAX_SUBS = 3;

function toEngineDecisions(decisions: readonly LiveMatchDecision[]): MatchDecision[] {
  return decisions.map((d) => ({ minute: d.minute, side: d.side, mentality: d.mentality, overallDelta: d.overallDelta, outPlayerId: d.outPlayerId, inPlayerId: d.inPlayerId }));
}

function currentMentality(decisions: readonly LiveMatchDecision[], side: 'home' | 'away'): 'defensive' | 'balanced' | 'attacking' {
  let mentality: 'defensive' | 'balanced' | 'attacking' = 'balanced';
  for (const d of decisions) {
    if (d.side === side && d.mentality) mentality = d.mentality;
  }
  return mentality;
}

// Builds the full deterministic timeline for a live match given its persisted
// decisions, using overlay-aware effective squads and PROGRESSION-adjusted
// overalls. The user side uses its resolved persistent XI so the watched match
// strength matches the committed instant sim exactly.
export async function buildLiveTimeline(live: LiveMatchDocument, fixture: FixtureDocument): Promise<MatchTimeline> {
  const userTeamId = live.userSide === 'home' ? live.homeTeamId : live.awayTeamId;
  const [homeTeam, awayTeam, homePlayers, awayPlayers, statsMap, lineup] = await Promise.all([
    getTeamById(live.homeTeamId),
    getTeamById(live.awayTeamId),
    getEffectiveSquad(fixture.careerId, live.homeTeamId),
    getEffectiveSquad(fixture.careerId, live.awayTeamId),
    getStatsMap(fixture.careerId),
    getLineup(fixture.careerId),
  ]);
  const squadByTeam = new Map<number, PlayerDocument[]>([
    [live.homeTeamId, homePlayers],
    [live.awayTeamId, awayPlayers],
  ]);

  const inputFor = (teamId: number) => {
    const team = teamId === live.homeTeamId ? homeTeam! : awayTeam!;
    const squad = squadByTeam.get(teamId) ?? [];
    if (teamId === userTeamId) {
      return buildUserTeamInput({ team, squad, statsMap, currentMatchday: live.matchday, savedLineup: lineup?.playerIds ?? [], formationId: lineup?.formationId }).input;
    }
    return buildProgressedTeamInput(team, squad, statsMap);
  };

  const home = inputFor(live.homeTeamId);
  const away = inputFor(live.awayTeamId);
  return timelineForFixture(fixture, home, away, toEngineDecisions(live.decisions));
}

// Projects a full timeline into a client-facing view revealed up to `minute`.
export async function buildLiveView(live: LiveMatchDocument, fixture: FixtureDocument): Promise<LiveMatchView> {
  const [homeTeam, awayTeam, lineup] = await Promise.all([getTeamById(live.homeTeamId), getTeamById(live.awayTeamId), getLineup(live.careerId)]);
  const timeline = await buildLiveTimeline(live, fixture);
  const cursor = live.minute;

  const revealedEvents = timeline.events.filter((e) => e.minute <= cursor || (cursor >= FULL_TIME_MINUTE && e.type === 'fulltime'));
  const revealedFrames = timeline.frames.filter((f) => f.minute <= cursor);
  const revealedPlayerFrames = timeline.playerFrames.filter((f) => f.minute <= cursor);
  const scoreEvent = [...revealedEvents].reverse().find(() => true);
  const homeGoals = scoreEvent?.homeGoals ?? 0;
  const awayGoals = scoreEvent?.awayGoals ?? 0;

  // Stats snapshot at the cursor (or the last one before it); kickoff = empty.
  const statsAt = [...timeline.statsFrames].reverse().find((s) => s.minute <= Math.max(1, cursor)) ?? timeline.statsFrames[0];
  const emptySide: SideStats = { possessionPct: 50, shots: 0, shotsOnTarget: 0, passes: 0, tackles: 0, corners: 0, fouls: 0 };
  const stats = cursor <= 0 || !statsAt ? { home: emptySide, away: emptySide } : { home: statsAt.home, away: statsAt.away };

  return {
    minute: cursor,
    finished: live.status === 'finished' || cursor >= FULL_TIME_MINUTE,
    homeTeamId: live.homeTeamId,
    awayTeamId: live.awayTeamId,
    homeTeamName: homeTeam?.name ?? '',
    awayTeamName: awayTeam?.name ?? '',
    userSide: live.userSide,
    homeGoals,
    awayGoals,
    finalHomeGoals: timeline.homeGoals,
    finalAwayGoals: timeline.awayGoals,
    userMentality: currentMentality(live.decisions, live.userSide),
    subsUsed: live.subsUsed,
    subsRemaining: Math.max(0, MAX_SUBS - live.subsUsed),
    events: revealedEvents,
    frames: revealedFrames,
    playerFrames: revealedPlayerFrames,
    stats,
    formationId: lineup?.formationId ?? DEFAULT_FORMATION,
    decisions: live.decisions,
  };
}

// The user side's on-pitch XI + bench for substitution UI (overlay- +
// progression-aware). The on-pitch XI is the resolved persistent lineup with
// injured/suspended players dropped and auto-filled; overalls are effective.
export async function buildLiveSquads(live: LiveMatchDocument): Promise<LiveMatchSquads> {
  const userTeamId = live.userSide === 'home' ? live.homeTeamId : live.awayTeamId;
  const [players, statsMap, lineup] = await Promise.all([getEffectiveSquad(live.careerId, userTeamId), getStatsMap(live.careerId), getLineup(live.careerId)]);
  const byId = new Map(players.map((p) => [p.eaPlayerId, p]));
  const { starters, bench } = resolveMatchdaySquad({ squad: players, statsMap, currentMatchday: live.matchday, savedLineup: lineup?.playerIds ?? [], formationSlots: getFormation(lineup?.formationId ?? DEFAULT_FORMATION).slots });
  const map = (id: number) => {
    const p = byId.get(id)!;
    return { playerId: p.eaPlayerId, name: p.shortName, overall: effectiveOverallFor(p, statsMap), positions: p.positions };
  };
  return { onPitch: starters.map(map), bench: bench.slice(0, 12).map(map) };
}
