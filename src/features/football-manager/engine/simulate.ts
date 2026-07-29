import { createRng, hashSeed } from './rng';
import type { SimGoal, SimResult, SimScorerInput, SimTeamInput } from './types';

const HOME_ADVANTAGE = 3; // effective overall boost for the home side
const BASE_EXPECTED_GOALS = 1.35; // league-average goals for an evenly-matched side
const STRENGTH_SCALE = 20; // overall-diff points that roughly double/halve xG

// Convert a team's effective strength (relative to the opponent) into an
// expected-goals figure, then sample an actual goal count from it.
function expectedGoals(attackStrength: number, defenceStrength: number): number {
  const diff = attackStrength - defenceStrength;
  const xg = BASE_EXPECTED_GOALS * Math.pow(2, diff / STRENGTH_SCALE);
  return Math.max(0.15, Math.min(5, xg));
}

// Sample a non-negative goal count from a Poisson distribution (Knuth's method).
function samplePoisson(lambda: number, rng: () => number): number {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > l);
  return k - 1;
}

// Pick a scorer weighted by attacking role and overall, so goals land on
// plausible players (a striker far more often than a defender).
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

function buildGoals(team: SimTeamInput, count: number, rng: () => number): SimGoal[] {
  const goals: SimGoal[] = [];
  for (let i = 0; i < count; i++) {
    const scorer = pickScorer(team.scorers, rng);
    goals.push({
      minute: 1 + Math.floor(rng() * 90),
      teamId: team.teamId,
      playerId: scorer?.playerId ?? team.teamId,
      playerName: scorer?.name ?? 'Unknown',
    });
  }
  return goals;
}

// Deterministically simulate a single match. Given the same seed and inputs the
// result is always identical, so instant-result and (future) 2D replay agree.
export function simulateMatch(home: SimTeamInput, away: SimTeamInput, seed: string | number): SimResult {
  const rng = createRng(typeof seed === 'string' ? hashSeed(seed) : seed >>> 0);

  const homeXg = expectedGoals(home.overall + HOME_ADVANTAGE, away.overall);
  const awayXg = expectedGoals(away.overall, home.overall + HOME_ADVANTAGE);

  const homeGoals = samplePoisson(homeXg, rng);
  const awayGoals = samplePoisson(awayXg, rng);

  const goals = [...buildGoals(home, homeGoals, rng), ...buildGoals(away, awayGoals, rng)].sort((a, b) => a.minute - b.minute);

  return { homeGoals, awayGoals, goals };
}
