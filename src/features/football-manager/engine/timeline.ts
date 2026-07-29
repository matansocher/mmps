import { createRng, hashSeed } from './rng';
import type { SimGoal, SimResult, SimScorerInput, SimSlot, SimTeamInput } from './types';

// A live match is modelled as a sequence of one-minute "possessions". Each
// minute one side is on the ball; a possession may fizzle out, win a chance
// (a shot) and, less often, score. The whole thing is driven by a single
// deterministic RNG seeded from the fixture identity, so replaying a match (or
// deriving an instant result from it) is always identical.
//
// In-match decisions (a mentality change or a substitution) adjust a team's
// EFFECTIVE strength from the minute they are applied onward. Past minutes are
// never recomputed, so the visible timeline stays stable while the remaining
// match reacts to the manager.

export type Mentality = 'defensive' | 'balanced' | 'attacking';

export type MatchSide = 'home' | 'away';

export type MatchDecision = {
  readonly minute: number; // applied from this minute (inclusive) onward
  readonly side: MatchSide;
  // A mentality change, a substitution (overall delta), or both.
  readonly mentality?: Mentality;
  readonly overallDelta?: number; // e.g. bringing on a stronger player: +2
  // Substitution identity (ignored by the sim; used by progression to compute
  // minutes played for the players involved).
  readonly outPlayerId?: number;
  readonly inPlayerId?: number;
};

export type TimelineEventType = 'kickoff' | 'chance' | 'goal' | 'halftime' | 'fulltime';

export type TimelineEvent = {
  readonly minute: number;
  readonly type: TimelineEventType;
  readonly side?: MatchSide; // which team the event belongs to (chance/goal)
  readonly playerId?: number;
  readonly playerName?: string;
  readonly homeGoals: number; // running score AFTER this event
  readonly awayGoals: number;
  readonly text: string; // ready-to-render ticker line
};

// A normalised ball position for the canvas renderer. x: 0 (home goal) .. 1
// (away goal); y: 0 (top touchline) .. 1 (bottom touchline).
export type BallFrame = {
  readonly minute: number;
  readonly x: number;
  readonly y: number;
  readonly possession: MatchSide;
};

// A normalised player position for the canvas renderer. Same coordinate space
// as BallFrame; each side carries 11 dots that drift with play/possession.
export type PlayerDot = {
  readonly x: number;
  readonly y: number;
};

export type PlayerFrame = {
  readonly minute: number;
  readonly home: readonly PlayerDot[];
  readonly away: readonly PlayerDot[];
};

// Cumulative comparative match stats per side, as of a given minute. Derived
// deterministically from the timeline so the panel is stable and recomputable.
export type SideStats = {
  possessionPct: number; // 0..100, integer
  shots: number;
  shotsOnTarget: number;
  passes: number;
  tackles: number;
  corners: number;
  fouls: number;
};

export type MatchStats = {
  readonly home: SideStats;
  readonly away: SideStats;
};

// Running stats snapshot at a minute, so the client can show the panel evolve.
export type StatsFrame = {
  readonly minute: number;
  readonly home: SideStats;
  readonly away: SideStats;
};

export type MatchTimeline = {
  readonly events: readonly TimelineEvent[];
  readonly frames: readonly BallFrame[];
  readonly playerFrames: readonly PlayerFrame[];
  readonly statsFrames: readonly StatsFrame[];
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly goals: readonly SimGoal[];
};

export const FULL_TIME_MINUTE = 90;
const HALF_TIME_MINUTE = 45;
const HOME_ADVANTAGE = 3;
const STRENGTH_SCALE = 20;

const MENTALITY_ATTACK: Record<Mentality, number> = { defensive: -3, balanced: 0, attacking: 4 };
const MENTALITY_DEFEND: Record<Mentality, number> = { defensive: 4, balanced: 0, attacking: -3 };

type SideState = {
  mentality: Mentality;
  overallDelta: number;
};

// Effective attacking / defending strength for a side at the current minute,
// factoring home advantage, mentality, formation lean and any sub deltas.
function attackStrength(base: number, home: boolean, state: SideState, attackLean: number): number {
  return base + (home ? HOME_ADVANTAGE : 0) + MENTALITY_ATTACK[state.mentality] + state.overallDelta + attackLean;
}

function defenceStrength(base: number, home: boolean, state: SideState): number {
  return base + (home ? HOME_ADVANTAGE : 0) + MENTALITY_DEFEND[state.mentality] + state.overallDelta;
}

// Per-minute probability that the given side is the one in possession. A
// formation's possession lean tilts the share slightly toward that side.
function possessionShare(homeAtk: number, awayAtk: number, possessionBias: number): number {
  const diff = homeAtk - awayAtk + possessionBias;
  return 1 / (1 + Math.pow(2, -diff / STRENGTH_SCALE));
}

// Chance-per-minute for the side in possession, given attack vs opponent
// defence. Tuned so a balanced match yields ~1.3 goals per side.
function chanceProbability(atk: number, def: number): number {
  const diff = atk - def;
  const base = 0.085 * Math.pow(2, diff / STRENGTH_SCALE);
  return Math.max(0.01, Math.min(0.22, base));
}

const CONVERSION = 0.34; // fraction of chances that become goals

function pickScorer(scorers: readonly SimScorerInput[], rng: () => number): SimScorerInput | null {
  if (scorers.length === 0) return null;
  const weighted = scorers.map((s) => ({ s, w: (s.isAttacker ? 3 : 1) * Math.max(1, s.overall - 40) }));
  const total = weighted.reduce((sum, item) => sum + item.w, 0);
  let threshold = rng() * total;
  for (const item of weighted) {
    threshold -= item.w;
    if (threshold <= 0) return item.s;
  }
  return weighted[weighted.length - 1].s;
}

// Ball position for a possession minute: attacking side pushes the ball toward
// the opponent goal, with vertical wander. A chance sits near the goal mouth.
function ballFor(side: MatchSide, attacking: boolean, rng: () => number): { x: number; y: number } {
  const y = 0.2 + rng() * 0.6;
  if (side === 'home') {
    const x = attacking ? 0.72 + rng() * 0.23 : 0.4 + rng() * 0.25;
    return { x, y };
  }
  const x = attacking ? 0.05 + rng() * 0.23 : 0.35 + rng() * 0.25;
  return { x, y };
}

function decisionsFor(decisions: readonly MatchDecision[], minute: number, side: MatchSide) {
  return decisions.filter((d) => d.side === side && d.minute <= minute);
}

// A neutral 4-3-3-ish slot layout used when a side provides no formation slots
// (e.g. AI teams). HOME orientation.
const FALLBACK_SLOTS: readonly SimSlot[] = [
  { x: 0.05, y: 0.5 },
  { x: 0.26, y: 0.14 },
  { x: 0.22, y: 0.38 },
  { x: 0.22, y: 0.62 },
  { x: 0.26, y: 0.86 },
  { x: 0.5, y: 0.3 },
  { x: 0.46, y: 0.5 },
  { x: 0.5, y: 0.7 },
  { x: 0.78, y: 0.18 },
  { x: 0.84, y: 0.5 },
  { x: 0.78, y: 0.82 },
];

// Places a side's 11 dots for a given minute. Base position = the formation
// slot (mirrored for away). The whole block shifts forward when the side has
// the ball and backward when defending, plus a small per-player deterministic
// jitter so the shape breathes rather than sitting perfectly still.
function dotsForSide(slots: readonly SimSlot[], side: MatchSide, hasBall: boolean, jitter: () => number): PlayerDot[] {
  const shift = (hasBall ? 0.08 : -0.05) + (jitter() - 0.5) * 0.03;
  return slots.map((s, i) => {
    // GK barely moves.
    const forward = i === 0 ? shift * 0.25 : shift;
    const jx = (jitter() - 0.5) * 0.04;
    const jy = (jitter() - 0.5) * 0.05;
    const homeX = Math.max(0.02, Math.min(0.98, s.x + forward + jx));
    const y = Math.max(0.04, Math.min(0.96, s.y + jy));
    // Away mirrors along the x axis.
    const x = side === 'home' ? homeX : 1 - homeX;
    return { x, y };
  });
}

function emptyStats(): SideStats {
  return { possessionPct: 0, shots: 0, shotsOnTarget: 0, passes: 0, tackles: 0, corners: 0, fouls: 0 };
}

function stateAt(decisions: readonly MatchDecision[], minute: number, side: MatchSide): SideState {
  const applied = decisionsFor(decisions, minute, side);
  let mentality: Mentality = 'balanced';
  let overallDelta = 0;
  for (const d of applied) {
    if (d.mentality) mentality = d.mentality;
    if (d.overallDelta) overallDelta += d.overallDelta;
  }
  return { mentality, overallDelta };
}

// Simulate the whole match minute-by-minute and emit a full timeline. The seed
// plus the decision list fully determine the output.
export function simulateTimeline(home: SimTeamInput, away: SimTeamInput, seed: string | number, decisions: readonly MatchDecision[] = []): MatchTimeline {
  const baseSeed = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0;
  const rng = createRng(baseSeed);
  // A SEPARATE aux stream for derived visuals/stats (player-dot jitter, pass /
  // tackle / foul counts). Kept independent so the primary walk that governs
  // events and goals is never perturbed — past events stay byte-identical when
  // a decision is applied mid-match.
  const auxRng = createRng((baseSeed ^ 0x9e3779b9) >>> 0);

  const events: TimelineEvent[] = [];
  const frames: BallFrame[] = [];
  const playerFrames: PlayerFrame[] = [];
  const statsFrames: StatsFrame[] = [];
  const goals: SimGoal[] = [];
  let homeGoals = 0;
  let awayGoals = 0;

  const homeSlots = home.slots ?? FALLBACK_SLOTS;
  const awaySlots = away.slots ?? FALLBACK_SLOTS;
  const homeAttackLean = home.attackLean ?? 0;
  const awayAttackLean = away.attackLean ?? 0;
  const possessionBias = (home.possessionLean ?? 0) - (away.possessionLean ?? 0);

  const stats = { home: emptyStats(), away: emptyStats() };
  let homePossessionMinutes = 0;

  events.push({ minute: 0, type: 'kickoff', homeGoals, awayGoals, text: 'Kick-off!' });

  for (let minute = 1; minute <= FULL_TIME_MINUTE; minute++) {
    const homeState = stateAt(decisions, minute, 'home');
    const awayState = stateAt(decisions, minute, 'away');
    const homeAtk = attackStrength(home.overall, true, homeState, homeAttackLean);
    const awayAtk = attackStrength(away.overall, false, awayState, awayAttackLean);
    const homeDef = defenceStrength(home.overall, true, homeState);
    const awayDef = defenceStrength(away.overall, false, awayState);

    const pShare = possessionShare(homeAtk, awayAtk, possessionBias);
    const side: MatchSide = rng() < pShare ? 'home' : 'away';
    const atk = side === 'home' ? homeAtk : awayAtk;
    const def = side === 'home' ? awayDef : homeDef;

    const chance = rng() < chanceProbability(atk, def);
    frames.push({ minute, possession: side, ...ballFor(side, chance, rng) });

    // --- Derived stats for this minute (aux stream; does not touch `rng`). ---
    if (side === 'home') homePossessionMinutes += 1;
    const sideStats = side === 'home' ? stats.home : stats.away;
    const oppStats = side === 'home' ? stats.away : stats.home;
    // Passes: several per possession minute, scaled by strength.
    sideStats.passes += 3 + Math.floor(auxRng() * 6);
    // Defensive actions by the side out of possession.
    if (auxRng() < 0.35) oppStats.tackles += 1;
    if (auxRng() < 0.12) oppStats.fouls += 1;

    if (chance) {
      sideStats.shots += 1;
      const team = side === 'home' ? home : away;
      const scored = rng() < CONVERSION;
      const onTarget = scored || auxRng() < 0.55;
      if (onTarget) sideStats.shotsOnTarget += 1;
      if (!scored && auxRng() < 0.4) sideStats.corners += 1;
      if (scored) {
        const scorer = pickScorer(team.scorers, rng);
        if (side === 'home') homeGoals++;
        else awayGoals++;
        const playerName = scorer?.name ?? 'Unknown';
        const playerId = scorer?.playerId ?? team.teamId;
        goals.push({ minute, teamId: team.teamId, playerId, playerName });
        events.push({ minute, type: 'goal', side, playerId, playerName, homeGoals, awayGoals, text: `⚽ GOAL! ${playerName} (${minute}')` });
      } else {
        const scorer = pickScorer(team.scorers, rng);
        events.push({ minute, type: 'chance', side, playerId: scorer?.playerId, playerName: scorer?.name, homeGoals, awayGoals, text: `${scorer?.name ?? 'A player'} goes close (${minute}')` });
      }
    }

    // Player dots + running stats snapshot for the minute.
    playerFrames.push({
      minute,
      home: dotsForSide(homeSlots, 'home', side === 'home', auxRng),
      away: dotsForSide(awaySlots, 'away', side === 'away', auxRng),
    });
    const homePct = Math.round((homePossessionMinutes / minute) * 100);
    statsFrames.push({
      minute,
      home: { ...stats.home, possessionPct: homePct },
      away: { ...stats.away, possessionPct: 100 - homePct },
    });

    if (minute === HALF_TIME_MINUTE) {
      events.push({ minute, type: 'halftime', homeGoals, awayGoals, text: `Half-time: ${homeGoals}–${awayGoals}` });
    }
  }

  events.push({ minute: FULL_TIME_MINUTE, type: 'fulltime', homeGoals, awayGoals, text: `Full-time: ${homeGoals}–${awayGoals}` });

  return { events, frames, playerFrames, statsFrames, homeGoals, awayGoals, goals };
}

// Instant result derived from the timeline (no decisions), so the number and
// attribution of goals a user sees in the live view exactly matches the table
// and top-scorers.
export function resultFromTimeline(home: SimTeamInput, away: SimTeamInput, seed: string | number): SimResult {
  const t = simulateTimeline(home, away, seed);
  return { homeGoals: t.homeGoals, awayGoals: t.awayGoals, goals: t.goals };
}
