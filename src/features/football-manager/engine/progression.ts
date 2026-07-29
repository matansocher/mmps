import { createRng, hashSeed } from './rng';

// Player progression model (Phase 5). All functions here are pure and
// deterministic: given the same inputs (and, where randomness matters, the same
// seed) they always produce the same output, so a matchday can be replayed and
// a career resumed on any device without drift.
//
// The four live attributes carried per career-player:
//   - form    : short-term momentum, -5..+5, decays toward 0.
//   - morale  : mood, 0..100, moved by results and playing time.
//   - fitness : match sharpness / stamina, 0..100; drops when a player starts,
//               recovers when rested. This is what makes rotation matter.
//   - overallDelta : permanent drift applied at season rollover (aging toward or
//               away from potential).
//
// The EFFECTIVE overall used by the match sim folds these together so a tired,
// out-of-form, low-morale star temporarily plays below his catalog rating, and a
// rested, in-form youngster plays above his.

export const FORM_MIN = -5;
export const FORM_MAX = 5;
export const MORALE_MIN = 0;
export const MORALE_MAX = 100;
export const FITNESS_MIN = 0;
export const FITNESS_MAX = 100;

export const DEFAULT_FORM = 0;
export const DEFAULT_MORALE = 70;
export const DEFAULT_FITNESS = 100;

// A player below this fitness at selection time is "exhausted" and should be
// rested; the UI flags it and the sim penalises playing him.
export const LOW_FITNESS_THRESHOLD = 45;

// Yellow cards that trigger a one-match suspension.
export const YELLOW_CARD_SUSPENSION_THRESHOLD = 5;
// Matches missed for a straight red / accumulation ban.
export const SUSPENSION_MATCHES = 1;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export type PlayerProgress = {
  readonly form: number; // -5..+5
  readonly morale: number; // 0..100
  readonly fitness: number; // 0..100
  readonly overallDelta: number; // permanent aging drift
};

export const DEFAULT_PROGRESS: PlayerProgress = {
  form: DEFAULT_FORM,
  morale: DEFAULT_MORALE,
  fitness: DEFAULT_FITNESS,
  overallDelta: 0,
};

// Effective overall the sim should use for a player, folding live attributes on
// top of the catalog base + permanent aging drift. Kept small so squad quality
// and transfers still dominate, but enough that rotation/form is felt.
//   form    contributes  form            (-5..+5)
//   morale  contributes  (morale-70)/15   (~ -4.7..+2)
//   fitness contributes  0 above 70, ramping to -8 at 0 fitness
export function effectiveOverall(base: number, progress: PlayerProgress): number {
  const moraleContribution = (progress.morale - DEFAULT_MORALE) / 15;
  const fitnessContribution = progress.fitness >= 70 ? 0 : -((70 - progress.fitness) / 70) * 8;
  const raw = base + progress.overallDelta + progress.form + moraleContribution + fitnessContribution;
  return Math.round(clamp(raw, 30, 99));
}

// --- Post-match attribute updates ---

export type MatchOutcome = 'win' | 'draw' | 'loss';

export type PlayerMatchInput = {
  readonly started: boolean;
  readonly minutesPlayed: number; // 0..90 (0 = unused sub / rested)
  readonly goals: number;
  readonly outcome: MatchOutcome;
};

// Updates a player's form/morale/fitness after one match. Deterministic (no RNG).
// Injuries + suspensions are handled separately (they need a seed).
export function applyMatchProgress(prev: PlayerProgress, input: PlayerMatchInput): PlayerProgress {
  const { started, minutesPlayed, goals, outcome } = input;
  const played = minutesPlayed > 0;

  // Form: results and goals nudge momentum; unused players drift toward 0.
  let form = prev.form;
  if (played) {
    form += outcome === 'win' ? 1 : outcome === 'loss' ? -1 : 0;
    form += goals; // each goal is a confidence boost
  } else {
    form += prev.form > 0 ? -1 : prev.form < 0 ? 1 : 0; // decay toward 0
  }
  form = clamp(form, FORM_MIN, FORM_MAX);

  // Morale: winning and playing lifts mood; losing and being benched hurts it.
  let morale = prev.morale;
  morale += outcome === 'win' ? 6 : outcome === 'loss' ? -6 : 0;
  morale += goals * 3;
  if (played) morale += 2;
  else morale -= started ? 0 : 4; // a fit player left out sulks a little
  morale = clamp(morale, MORALE_MIN, MORALE_MAX);

  // Fitness: starting drains stamina proportional to minutes; resting recovers.
  let fitness = prev.fitness;
  if (played) fitness -= 8 + Math.round((minutesPlayed / 90) * 20); // ~ -8..-28
  else fitness += 25; // a full match's rest
  fitness = clamp(fitness, FITNESS_MIN, FITNESS_MAX);

  return { form, morale, fitness, overallDelta: prev.overallDelta };
}

// --- Injuries ---

// Rolls for an in-match injury. Lower fitness => higher risk, so overplaying a
// tired player is punished. Deterministic given the seed. Returns matches out
// (0 = no injury).
export function rollInjury(fitness: number, minutesPlayed: number, seed: string): number {
  if (minutesPlayed <= 0) return 0;
  const rng = createRng(hashSeed(seed));
  // Base 1.5% per match, rising sharply as fitness falls below 60.
  const fatigue = fitness >= 60 ? 0 : (60 - fitness) / 60; // 0..1
  const chance = 0.015 + fatigue * 0.06; // up to ~7.5%
  if (rng() >= chance) return 0;
  // Severity 1..4 matches, weighted toward the short end.
  const r = rng();
  if (r < 0.55) return 1;
  if (r < 0.85) return 2;
  if (r < 0.96) return 3;
  return 4;
}

// --- Suspensions (card accumulation) ---

export type CardResult = {
  readonly yellowCards: number; // new running total this season
  readonly suspensionMatches: number; // matches to sit out (0 if none)
};

// Rolls cards for a player who featured and updates the running yellow total,
// returning any resulting suspension. A straight red (rare) is an immediate ban;
// hitting the yellow threshold triggers a ban and resets the counter.
export function rollCards(prevYellows: number, minutesPlayed: number, seed: string): CardResult {
  if (minutesPlayed <= 0) return { yellowCards: prevYellows, suspensionMatches: 0 };
  const rng = createRng(hashSeed(seed));

  // ~4% straight red.
  if (rng() < 0.04) {
    return { yellowCards: prevYellows, suspensionMatches: SUSPENSION_MATCHES };
  }
  // ~22% yellow.
  if (rng() < 0.22) {
    const yellowCards = prevYellows + 1;
    if (yellowCards >= YELLOW_CARD_SUSPENSION_THRESHOLD) {
      return { yellowCards: 0, suspensionMatches: SUSPENSION_MATCHES };
    }
    return { yellowCards, suspensionMatches: 0 };
  }
  return { yellowCards: prevYellows, suspensionMatches: 0 };
}

// --- Aging (season rollover) ---

// Permanent overall drift applied once per season. Young players below their
// potential climb toward it; older players decline. Returns the NEW cumulative
// overallDelta to persist. `base` is the catalog overall (fixed); `overallDelta`
// is what has already accumulated.
export function applyAging(base: number, potential: number, age: number, overallDelta: number, seed: string): number {
  const rng = createRng(hashSeed(seed));
  const current = base + overallDelta;
  let change = 0;

  if (age <= 23) {
    // Rising: gap to potential drives growth, faster when younger.
    const gap = Math.max(0, potential - current);
    if (gap > 0) change = Math.min(gap, 1 + Math.round(rng() * 2)); // +1..+3, capped by gap
  } else if (age <= 29) {
    // Prime: small ups and downs.
    change = rng() < 0.5 ? 0 : rng() < 0.5 ? 1 : -1;
  } else if (age <= 32) {
    change = -(1 + (rng() < 0.4 ? 1 : 0)); // -1..-2
  } else {
    change = -(2 + (rng() < 0.5 ? 1 : 0)); // -2..-3
  }

  // Never let aging push a player below 30 or above his potential+1.
  const nextOverall = clamp(current + change, 30, potential + 1);
  return nextOverall - base;
}
