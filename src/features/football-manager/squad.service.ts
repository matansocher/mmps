import { buildTeamInput } from './match.service';
import { effectiveOverallFor, resolveMatchdaySquad } from './mongo/progression.repository';
import { DEFAULT_FORMATION, getFormation, outOfPositionPenalty, type SimSlot, type SimTeamInput } from './engine';
import type { CareerPlayerStatsDocument, PlayerDocument, TeamDocument } from './types';

// Builds a sim input for a team with Phase-5 progression applied: each player's
// EFFECTIVE overall (form/morale/fitness/aging) replaces the catalog overall,
// and the team strength is the mean of the top-18 effective overalls.
//
// `starterOrder` (optional) is an ordered list of playerIds to place first (the
// user's resolved starting XI); everyone else follows by effective overall.
// AI teams pass no order and are implicitly sorted best-first.
export function buildProgressedTeamInput(
  team: TeamDocument,
  squad: readonly PlayerDocument[],
  statsMap: Map<number, CareerPlayerStatsDocument>,
  starterOrder?: readonly number[],
): SimTeamInput {
  const withEffective = squad.map((p) => ({ player: p, eff: effectiveOverallFor(p, statsMap) }));

  // Order: explicit starters first (in given order), then the rest by effective
  // overall descending. Without an order, purely best-first.
  const orderIndex = new Map((starterOrder ?? []).map((id, i) => [id, i]));
  withEffective.sort((a, b) => {
    const ai = orderIndex.has(a.player.eaPlayerId) ? orderIndex.get(a.player.eaPlayerId)! : Number.POSITIVE_INFINITY;
    const bi = orderIndex.has(b.player.eaPlayerId) ? orderIndex.get(b.player.eaPlayerId)! : Number.POSITIVE_INFINITY;
    if (ai !== bi) return ai - bi;
    return b.eff - a.eff;
  });

  const ordered = withEffective.map((x) => ({ ...x.player, overall: x.eff }) as PlayerDocument);
  const top = ordered.slice(0, 18);
  const teamOverall = top.length ? Math.round(top.reduce((sum, p) => sum + p.overall, 0) / top.length) : team.overall;
  return buildTeamInput(team, ordered, teamOverall);
}

// Per-starter out-of-position penalty for the chosen formation. Starter at
// index i is assigned formation slot i; the penalty compares that slot's role
// to the player's natural positions. Returns a map playerId -> penalty (<= 0).
export function outOfPositionPenalties(formationId: string, starters: readonly number[], byId: Map<number, PlayerDocument>): Map<number, number> {
  const formation = getFormation(formationId);
  const penalties = new Map<number, number>();
  starters.forEach((id, i) => {
    const slot = formation.slots[i];
    const player = byId.get(id);
    if (!slot || !player) return;
    penalties.set(id, outOfPositionPenalty(slot.role, player.positions));
  });
  return penalties;
}

function toSimSlots(slots: readonly { readonly x: number; readonly y: number }[]): SimSlot[] {
  return slots.map((s) => ({ x: s.x, y: s.y }));
}

// Builds an input where each starter's `overall` already includes the
// out-of-position penalty. Non-starters keep their effective overall via
// statsMap. Team overall = mean of top-18 of the resulting effective overalls.
function buildDirectTeamInput(
  team: TeamDocument,
  penalisedSquad: readonly PlayerDocument[],
  statsMap: Map<number, CareerPlayerStatsDocument>,
  starterOrder: readonly number[],
  slots: readonly { readonly x: number; readonly y: number }[],
): SimTeamInput {
  const starterSet = new Set(starterOrder);
  const withEffective = penalisedSquad.map((p) => ({
    player: p,
    eff: starterSet.has(p.eaPlayerId) ? p.overall : effectiveOverallFor(p, statsMap),
  }));
  const orderIndex = new Map(starterOrder.map((id, i) => [id, i]));
  withEffective.sort((a, b) => {
    const ai = orderIndex.has(a.player.eaPlayerId) ? orderIndex.get(a.player.eaPlayerId)! : Number.POSITIVE_INFINITY;
    const bi = orderIndex.has(b.player.eaPlayerId) ? orderIndex.get(b.player.eaPlayerId)! : Number.POSITIVE_INFINITY;
    if (ai !== bi) return ai - bi;
    return b.eff - a.eff;
  });
  const ordered = withEffective.map((x) => ({ ...x.player, overall: x.eff }) as PlayerDocument);
  const top = ordered.slice(0, 18);
  const teamOverall = top.length ? Math.round(top.reduce((sum, p) => sum + p.overall, 0) / top.length) : team.overall;
  return { ...buildTeamInput(team, ordered, teamOverall), slots: toSimSlots(slots) };
}

// Convenience: for the USER's team, resolve the persisted XI (dropping
// unavailable players, auto-filling from the best available), apply the chosen
// formation (out-of-position penalties on effective overall + slot coordinates
// + tactical lean), and build the progressed input.
export function buildUserTeamInput(params: {
  readonly team: TeamDocument;
  readonly squad: readonly PlayerDocument[];
  readonly statsMap: Map<number, CareerPlayerStatsDocument>;
  readonly currentMatchday: number;
  readonly savedLineup: readonly number[];
  readonly formationId?: string;
}): { readonly input: SimTeamInput; readonly starters: number[]; readonly bench: number[] } {
  const { team, squad, statsMap, currentMatchday, savedLineup } = params;
  const formationId = params.formationId ?? DEFAULT_FORMATION;
  const formation = getFormation(formationId);
  const { starters, bench } = resolveMatchdaySquad({ squad, statsMap, currentMatchday, savedLineup, formationSlots: formation.slots });
  const byId = new Map(squad.map((p) => [p.eaPlayerId, p]));

  // Apply out-of-position penalties to the starters' effective overalls before
  // building the input, so a mis-slotted player genuinely weakens the team.
  const penalties = outOfPositionPenalties(formationId, starters, byId);
  const penalisedSquad = squad.map((p) => {
    const penalty = penalties.get(p.eaPlayerId) ?? 0;
    if (penalty === 0) return p;
    const eff = effectiveOverallFor(p, statsMap) + penalty;
    return { ...p, overall: Math.max(30, eff) } as PlayerDocument;
  });

  const input = buildDirectTeamInput(team, penalisedSquad, statsMap, starters, formation.slots);
  return {
    input: { ...input, attackLean: formation.attackLean, possessionLean: formation.possessionLean },
    starters,
    bench,
  };
}
