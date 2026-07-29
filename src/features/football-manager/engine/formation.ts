// Formations are the manager's on-pitch shape. Each formation is an ordered
// list of 11 slots (goalkeeper first) with a role code and a normalised pitch
// coordinate for the HOME side (x: 0 own goal .. 1 opponent goal; y: 0 top
// touchline .. 1 bottom). The away side mirrors x. Slots feed three things:
//   1. the pre-match / live pitch render (where each dot sits),
//   2. the out-of-position penalty (assigned slot role vs a player's natural
//      positions), and
//   3. a small formation-wide tactical nudge (attack/possession lean).
//
// This module is PURE and deterministic — no DB, no RNG — so it is fully unit
// testable and safe to call from both the sim and the client-facing services.

export type FormationId = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2' | '5-3-2';

// A single position on the pitch. `role` is an EA-style position code so it can
// be compared against a player's natural `positions`.
export type FormationSlot = {
  readonly role: string; // e.g. 'GK', 'CB', 'LB', 'CM', 'CAM', 'LW', 'ST'
  readonly x: number; // 0 (own goal) .. 1 (opponent goal), HOME orientation
  readonly y: number; // 0 (top) .. 1 (bottom)
};

export type Formation = {
  readonly id: FormationId;
  readonly name: string;
  readonly slots: readonly FormationSlot[]; // exactly 11, GK first
  // Tactical lean applied on top of the manager's mentality. Positive attack =
  // more chances/possession forward; positive possession = holds the ball more.
  readonly attackLean: number; // small overall-equivalent nudge, ~[-3..+3]
  readonly possessionLean: number; // shifts possession share slightly, ~[-3..+3]
};

// Coordinates are laid out in five vertical bands (GK, defence, holding,
// midfield/attacking-mid, attack). y is spread evenly across the width.
export const FORMATIONS: Record<FormationId, Formation> = {
  '4-3-3': {
    id: '4-3-3',
    name: '4-3-3',
    attackLean: 3,
    possessionLean: 1,
    slots: [
      { role: 'GK', x: 0.05, y: 0.5 },
      { role: 'LB', x: 0.26, y: 0.14 },
      { role: 'CB', x: 0.22, y: 0.38 },
      { role: 'CB', x: 0.22, y: 0.62 },
      { role: 'RB', x: 0.26, y: 0.86 },
      { role: 'CM', x: 0.5, y: 0.3 },
      { role: 'CM', x: 0.46, y: 0.5 },
      { role: 'CM', x: 0.5, y: 0.7 },
      { role: 'LW', x: 0.78, y: 0.18 },
      { role: 'ST', x: 0.84, y: 0.5 },
      { role: 'RW', x: 0.78, y: 0.82 },
    ],
  },
  '4-4-2': {
    id: '4-4-2',
    name: '4-4-2',
    attackLean: 0,
    possessionLean: 0,
    slots: [
      { role: 'GK', x: 0.05, y: 0.5 },
      { role: 'LB', x: 0.26, y: 0.14 },
      { role: 'CB', x: 0.22, y: 0.38 },
      { role: 'CB', x: 0.22, y: 0.62 },
      { role: 'RB', x: 0.26, y: 0.86 },
      { role: 'LM', x: 0.54, y: 0.14 },
      { role: 'CM', x: 0.48, y: 0.38 },
      { role: 'CM', x: 0.48, y: 0.62 },
      { role: 'RM', x: 0.54, y: 0.86 },
      { role: 'ST', x: 0.82, y: 0.38 },
      { role: 'ST', x: 0.82, y: 0.62 },
    ],
  },
  '4-2-3-1': {
    id: '4-2-3-1',
    name: '4-2-3-1',
    attackLean: 1,
    possessionLean: 2,
    slots: [
      { role: 'GK', x: 0.05, y: 0.5 },
      { role: 'LB', x: 0.26, y: 0.14 },
      { role: 'CB', x: 0.22, y: 0.38 },
      { role: 'CB', x: 0.22, y: 0.62 },
      { role: 'RB', x: 0.26, y: 0.86 },
      { role: 'CDM', x: 0.42, y: 0.38 },
      { role: 'CDM', x: 0.42, y: 0.62 },
      { role: 'LM', x: 0.66, y: 0.18 },
      { role: 'CAM', x: 0.64, y: 0.5 },
      { role: 'RM', x: 0.66, y: 0.82 },
      { role: 'ST', x: 0.86, y: 0.5 },
    ],
  },
  '3-5-2': {
    id: '3-5-2',
    name: '3-5-2',
    attackLean: 1,
    possessionLean: 3,
    slots: [
      { role: 'GK', x: 0.05, y: 0.5 },
      { role: 'CB', x: 0.22, y: 0.28 },
      { role: 'CB', x: 0.2, y: 0.5 },
      { role: 'CB', x: 0.22, y: 0.72 },
      { role: 'LWB', x: 0.52, y: 0.1 },
      { role: 'CM', x: 0.5, y: 0.34 },
      { role: 'CM', x: 0.46, y: 0.5 },
      { role: 'CM', x: 0.5, y: 0.66 },
      { role: 'RWB', x: 0.52, y: 0.9 },
      { role: 'ST', x: 0.82, y: 0.38 },
      { role: 'ST', x: 0.82, y: 0.62 },
    ],
  },
  '5-3-2': {
    id: '5-3-2',
    name: '5-3-2',
    attackLean: -3,
    possessionLean: -1,
    slots: [
      { role: 'GK', x: 0.05, y: 0.5 },
      { role: 'LWB', x: 0.32, y: 0.1 },
      { role: 'CB', x: 0.2, y: 0.32 },
      { role: 'CB', x: 0.18, y: 0.5 },
      { role: 'CB', x: 0.2, y: 0.68 },
      { role: 'RWB', x: 0.32, y: 0.9 },
      { role: 'CM', x: 0.5, y: 0.3 },
      { role: 'CM', x: 0.46, y: 0.5 },
      { role: 'CM', x: 0.5, y: 0.7 },
      { role: 'ST', x: 0.82, y: 0.38 },
      { role: 'ST', x: 0.82, y: 0.62 },
    ],
  },
};

export const FORMATION_IDS: readonly FormationId[] = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2'];

export const DEFAULT_FORMATION: FormationId = '4-3-3';

export function getFormation(id: string | null | undefined): Formation {
  return FORMATIONS[(id as FormationId) ?? DEFAULT_FORMATION] ?? FORMATIONS[DEFAULT_FORMATION];
}

// Out-of-position penalty. Roles are grouped into families; playing in a
// related family is a small hit, an unrelated family is a bigger hit, and any
// outfield player in goal (or the GK outfield) is punished hard.
export const OUT_OF_POSITION_RELATED = -2;
export const OUT_OF_POSITION_UNRELATED = -5;
export const OUT_OF_POSITION_GK = -12;

// Related-role clusters: playing anywhere inside your own cluster is "natural"
// (no penalty), an adjacent cluster is "related", anything else "unrelated".
const ROLE_FAMILY: Record<string, string> = {
  GK: 'gk',
  CB: 'cb',
  LB: 'fb',
  RB: 'fb',
  LWB: 'fb',
  RWB: 'fb',
  CDM: 'dm',
  CM: 'cm',
  CAM: 'am',
  LM: 'wm',
  RM: 'wm',
  LW: 'w',
  RW: 'w',
  CF: 'st',
  ST: 'st',
};

// Which families count as "related" (adjacent) to each family.
const RELATED_FAMILIES: Record<string, readonly string[]> = {
  gk: [],
  cb: ['fb', 'dm'],
  fb: ['cb', 'wm', 'dm'],
  dm: ['cm', 'cb', 'fb'],
  cm: ['dm', 'am'],
  am: ['cm', 'w', 'st'],
  wm: ['w', 'fb', 'cm'],
  w: ['wm', 'am', 'st'],
  st: ['am', 'w'],
};

function familyOf(role: string): string {
  return ROLE_FAMILY[role] ?? 'cm';
}

// Penalty (<= 0) for playing a player with `naturalPositions` in `slotRole`.
export function outOfPositionPenalty(slotRole: string, naturalPositions: readonly string[]): number {
  const slotFamily = familyOf(slotRole);
  const naturalFamilies = new Set(naturalPositions.map(familyOf));
  const isGkSlot = slotFamily === 'gk';
  const isGkPlayer = naturalFamilies.has('gk');

  // GK mismatch (outfielder in goal, or keeper outfield) is a heavy penalty.
  if (isGkSlot !== isGkPlayer) return OUT_OF_POSITION_GK;
  if (isGkSlot && isGkPlayer) return 0;

  if (naturalFamilies.has(slotFamily)) return 0;
  for (const fam of naturalFamilies) {
    if ((RELATED_FAMILIES[slotFamily] ?? []).includes(fam)) return OUT_OF_POSITION_RELATED;
  }
  return OUT_OF_POSITION_UNRELATED;
}

// A squad member considered for automatic slot assignment.
export type LineupCandidate = {
  readonly id: number;
  readonly positions: readonly string[];
  readonly overall: number; // effective overall
};

// Picks the best XI for a formation by assigning the strongest well-fitting
// player to each slot. Deterministic and position-aware: a right-back is never
// defaulted to striker just because his overall is high. Returns the chosen
// player ids in slot order (index i belongs in slots[i]).
//
// Strategy: fill by fit tier. First lock in every natural (0-penalty) pairing —
// globally, strongest natural player to each open natural slot — so specialists
// claim their real positions before anyone is played out of position. Only then
// do we consider related (−2), then unrelated (−5), then goalkeeper-emergency
// (−12) placements for whatever slots remain. Within a tier we greedily take the
// best (slot, candidate) pair, breaking ties on higher overall then lower id.
export function buildDefaultLineup(slots: readonly FormationSlot[], candidates: readonly LineupCandidate[]): number[] {
  const remaining = new Map(candidates.map((c) => [c.id, c]));
  const result: number[] = new Array(slots.length).fill(0);
  const openSlots = new Set(slots.map((_, i) => i));

  const tiers = [0, OUT_OF_POSITION_RELATED, OUT_OF_POSITION_UNRELATED, OUT_OF_POSITION_GK];
  for (const tier of tiers) {
    let progressed = true;
    while (progressed) {
      progressed = false;
      let bestSlot = -1;
      let bestCand: LineupCandidate | null = null;
      for (const slotIdx of openSlots) {
        const role = slots[slotIdx].role;
        for (const c of remaining.values()) {
          if (outOfPositionPenalty(role, c.positions) !== tier) continue;
          if (bestCand == null || c.overall > bestCand.overall || (c.overall === bestCand.overall && c.id < bestCand.id)) {
            bestCand = c;
            bestSlot = slotIdx;
          }
        }
      }
      if (bestCand) {
        result[bestSlot] = bestCand.id;
        remaining.delete(bestCand.id);
        openSlots.delete(bestSlot);
        progressed = true;
      }
    }
  }

  // Fill any empty slots (fewer than 11 candidates) with whatever remains.
  const leftover = [...remaining.keys()];
  for (const slotIdx of openSlots) {
    if (leftover.length) result[slotIdx] = leftover.shift() as number;
  }
  return result;
}
