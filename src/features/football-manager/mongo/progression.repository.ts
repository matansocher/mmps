import { getMongoCollection } from '@core/mongo';
import {
  applyAging,
  applyMatchProgress,
  buildDefaultLineup,
  DEFAULT_PROGRESS,
  effectiveOverall,
  type FormationSlot,
  type LineupCandidate,
  type MatchOutcome,
  OUT_OF_POSITION_GK,
  outOfPositionPenalty,
  type PlayerMatchInput,
  type PlayerProgress,
  rollCards,
  rollInjury,
} from '../engine';
import { CAREER_LINEUPS_COLLECTION, CAREER_PLAYER_STATS_COLLECTION, FOOTBALL_MANAGER_DB_NAME } from '../constants';
import type { CareerLineupDocument, CareerPlayerStatsDocument, PlayerAvailability, PlayerDocument } from '../types';

function getStatsCollection() {
  return getMongoCollection<CareerPlayerStatsDocument>(FOOTBALL_MANAGER_DB_NAME, CAREER_PLAYER_STATS_COLLECTION);
}

function getLineupsCollection() {
  return getMongoCollection<CareerLineupDocument>(FOOTBALL_MANAGER_DB_NAME, CAREER_LINEUPS_COLLECTION);
}

// --- Reads ---

// Map of playerId -> stats doc for a career (only players that have a doc).
export async function getStatsMap(careerId: string): Promise<Map<number, CareerPlayerStatsDocument>> {
  const rows = await getStatsCollection().find({ careerId }).toArray();
  return new Map(rows.map((r) => [r.playerId, r]));
}

// A player's live progress (defaults when no doc yet).
export function progressFromStats(stats: CareerPlayerStatsDocument | undefined): PlayerProgress {
  if (!stats) return DEFAULT_PROGRESS;
  return { form: stats.form, morale: stats.morale, fitness: stats.fitness, overallDelta: stats.overallDelta };
}

// Availability of a player at the given matchday (unavailable while injured/suspended).
export function availabilityAt(stats: CareerPlayerStatsDocument | undefined, currentMatchday: number): PlayerAvailability {
  if (!stats) return 'available';
  if (stats.injuredUntilMatchday && currentMatchday <= stats.injuredUntilMatchday) return 'injured';
  if (stats.suspendedUntilMatchday && currentMatchday <= stats.suspendedUntilMatchday) return 'suspended';
  return 'available';
}

// A player's effective overall for the sim, applying this career's progression.
export function effectiveOverallFor(player: PlayerDocument, statsMap: Map<number, CareerPlayerStatsDocument>): number {
  return effectiveOverall(player.overall, progressFromStats(statsMap.get(player.eaPlayerId)));
}

// --- Persistent lineup (starting XI) ---

export async function getLineup(careerId: string): Promise<CareerLineupDocument | null> {
  return getLineupsCollection().findOne({ careerId });
}

export async function setLineup(careerId: string, playerIds: readonly number[], formationId?: string): Promise<void> {
  const set: Record<string, unknown> = { careerId, playerIds: playerIds.slice(0, 11), updatedAt: new Date() };
  if (formationId) set.formationId = formationId;
  await getLineupsCollection().updateOne({ careerId }, { $set: set }, { upsert: true });
}

export async function clearLineup(careerId: string): Promise<void> {
  await getLineupsCollection().deleteOne({ careerId });
}

// Resolves the actual starting XI for a matchday from the persisted lineup,
// dropping unavailable players and auto-filling from the squad. When a saved
// lineup exists its slot ORDER is preserved (index i = the player the manager
// put in slots[i]); unavailable/missing slots are back-filled by best fit for
// that slot. With no saved lineup and `formationSlots` supplied, the default XI
// is built position-aware (best natural player per slot) so e.g. a right-back
// is never defaulted into the striker slot. Returns slot-ordered starters +ben.
export function resolveMatchdaySquad(params: {
  readonly squad: readonly PlayerDocument[]; // effective squad, catalog order
  readonly statsMap: Map<number, CareerPlayerStatsDocument>;
  readonly currentMatchday: number;
  readonly savedLineup: readonly number[];
  readonly formationSlots?: readonly FormationSlot[];
}): { readonly starters: number[]; readonly bench: number[] } {
  const { squad, statsMap, currentMatchday, savedLineup, formationSlots } = params;
  const byId = new Map(squad.map((p) => [p.eaPlayerId, p]));
  const isAvailable = (id: number) => byId.has(id) && availabilityAt(statsMap.get(id), currentMatchday) === 'available';

  // Available squad sorted by effective overall (used to auto-fill + build bench).
  const availableSorted = squad
    .filter((p) => availabilityAt(statsMap.get(p.eaPlayerId), currentMatchday) === 'available')
    .sort((a, b) => effectiveOverallFor(b, statsMap) - effectiveOverallFor(a, statsMap))
    .map((p) => p.eaPlayerId);

  let starters: number[] = [];

  const hasSaved = savedLineup.some((id) => isAvailable(id));
  if (!hasSaved && formationSlots && formationSlots.length === 11) {
    // Position-aware default XI: pick the best-fitting available player per slot.
    const candidates: LineupCandidate[] = availableSorted.map((id) => {
      const p = byId.get(id) as PlayerDocument;
      return { id, positions: p.positions, overall: effectiveOverallFor(p, statsMap) };
    });
    starters = buildDefaultLineup(formationSlots, candidates);
  } else {
    // Preserve the manager's saved slot order, then back-fill empty/unavailable
    // slots. When formation slots are known we back-fill by best fit per slot.
    const slotCount = formationSlots?.length ?? 11;
    starters = new Array(slotCount).fill(0);
    const used = new Set<number>();
    for (let i = 0; i < slotCount; i += 1) {
      const id = savedLineup[i];
      if (id == null || !isAvailable(id) || used.has(id)) continue;
      // Respect the manager's saved slot — but never trust a hard GK mismatch
      // (a keeper stranded in an outfield slot, or an outfielder in goal). That
      // only ever comes from stale/auto-generated lineups, so drop it and let the
      // position-aware back-fill below claim the slot instead.
      const role = formationSlots?.[i]?.role;
      const p = byId.get(id) as PlayerDocument;
      if (role && outOfPositionPenalty(role, p.positions) === OUT_OF_POSITION_GK) continue;
      starters[i] = id;
      used.add(id);
    }
    for (let i = 0; i < slotCount; i += 1) {
      if (starters[i]) continue;
      const role = formationSlots?.[i]?.role;
      let pick: number | null = null;
      if (role) {
        let bestScore = Number.NEGATIVE_INFINITY;
        for (const id of availableSorted) {
          if (used.has(id)) continue;
          const p = byId.get(id) as PlayerDocument;
          const score = effectiveOverallFor(p, statsMap) + outOfPositionPenalty(role, p.positions);
          if (score > bestScore) {
            bestScore = score;
            pick = id;
          }
        }
      } else {
        pick = availableSorted.find((id) => !used.has(id)) ?? null;
      }
      if (pick != null) {
        starters[i] = pick;
        used.add(pick);
      }
    }
    starters = starters.filter((id) => id);
  }

  const starterSet = new Set(starters);
  const bench = availableSorted.filter((id) => !starterSet.has(id));
  return { starters, bench };
}

// --- Post-match progression ---

export type PlayerMatchStat = {
  readonly playerId: number;
  readonly started: boolean;
  readonly minutesPlayed: number;
  readonly goals: number;
};

// Applies one matchday's outcome to a set of the user's players: updates
// form/morale/fitness, rolls injuries + cards, and writes back. Deterministic
// per (career, season, matchday, player) so re-running is idempotent-ish (same
// injuries/cards). `seedPrefix` scopes the RNG to the fixture.
export async function applyMatchdayProgress(params: {
  readonly careerId: string;
  readonly currentMatchday: number;
  readonly outcome: MatchOutcome;
  readonly playerStats: readonly PlayerMatchStat[];
  readonly seedPrefix: string;
}): Promise<void> {
  const { careerId, currentMatchday, outcome, playerStats, seedPrefix } = params;
  const statsMap = await getStatsMap(careerId);
  const now = new Date();

  const ops = playerStats.map((ps) => {
    const prev = statsMap.get(ps.playerId);
    const prevProgress = progressFromStats(prev);
    const input: PlayerMatchInput = { started: ps.started, minutesPlayed: ps.minutesPlayed, goals: ps.goals, outcome };
    const next = applyMatchProgress(prevProgress, input);

    const injury = rollInjury(prevProgress.fitness, ps.minutesPlayed, `${seedPrefix}:inj:${ps.playerId}`);
    const cards = rollCards(prev?.yellowCards ?? 0, ps.minutesPlayed, `${seedPrefix}:card:${ps.playerId}`);

    const injuredUntilMatchday = injury > 0 ? currentMatchday + injury : (prev?.injuredUntilMatchday ?? null);
    const suspendedUntilMatchday = cards.suspensionMatches > 0 ? currentMatchday + cards.suspensionMatches : (prev?.suspendedUntilMatchday ?? null);

    const doc: Omit<CareerPlayerStatsDocument, '_id'> = {
      careerId,
      playerId: ps.playerId,
      form: next.form,
      morale: next.morale,
      fitness: next.fitness,
      overallDelta: next.overallDelta,
      yellowCards: cards.yellowCards,
      injuredUntilMatchday,
      suspendedUntilMatchday,
      agedForSeason: prev?.agedForSeason ?? null,
      updatedAt: now,
    };
    return {
      updateOne: {
        filter: { careerId, playerId: ps.playerId },
        update: { $set: doc },
        upsert: true,
      },
    };
  });

  if (ops.length) await getStatsCollection().bulkWrite(ops);
}

// --- Aging (season rollover) ---

// Applies one-per-season aging to a set of players and clears season-scoped
// card/suspension/injury state. Fitness and morale reset to defaults for the new
// season; form carries over lightly. Idempotent per season via `agedForSeason`.
export async function applySeasonAging(params: {
  readonly careerId: string;
  readonly newSeasonNumber: number;
  readonly players: readonly PlayerDocument[];
  readonly seedPrefix: string;
}): Promise<void> {
  const { careerId, newSeasonNumber, players, seedPrefix } = params;
  const statsMap = await getStatsMap(careerId);
  const now = new Date();

  const ops = players.map((player) => {
    const prev = statsMap.get(player.eaPlayerId);
    const overallDelta = prev?.overallDelta ?? 0;
    // Skip if already aged for this season (idempotent rollover).
    const alreadyAged = prev?.agedForSeason === newSeasonNumber;
    const nextDelta = alreadyAged ? overallDelta : applyAging(player.overall, player.potential, player.age, overallDelta, `${seedPrefix}:${player.eaPlayerId}`);

    const doc: Omit<CareerPlayerStatsDocument, '_id'> = {
      careerId,
      playerId: player.eaPlayerId,
      form: prev ? Math.round(prev.form / 2) : DEFAULT_PROGRESS.form, // half of last season's form
      morale: DEFAULT_PROGRESS.morale,
      fitness: DEFAULT_PROGRESS.fitness,
      overallDelta: nextDelta,
      yellowCards: 0,
      injuredUntilMatchday: null,
      suspendedUntilMatchday: null,
      agedForSeason: newSeasonNumber,
      updatedAt: now,
    };
    return { updateOne: { filter: { careerId, playerId: player.eaPlayerId }, update: { $set: doc }, upsert: true } };
  });

  if (ops.length) await getStatsCollection().bulkWrite(ops);
}

// --- Lifecycle resets ---

// Full reset for a brand-new career (wipes all progression + lineup).
export async function resetProgression(careerId: string): Promise<void> {
  await Promise.all([getStatsCollection().deleteMany({ careerId }), getLineupsCollection().deleteMany({ careerId })]);
}
