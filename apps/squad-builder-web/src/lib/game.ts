import playersData from '../data/players.json';
import { FORMATION, slotsForPosition, type Slot, type SlotType } from './positions';

export type Player = {
  readonly id: number;
  readonly name: string;
  readonly overall: number;
  readonly position: string;
  readonly alternatePositions: readonly string[];
  readonly club: string;
  readonly nationality: string | null;
  readonly avatarUrl: string | null;
  readonly clubLogoUrl: string | null;
  readonly flagUrl: string | null;
};

export type Placement = {
  readonly slotId: string;
  readonly player: Player;
  readonly viaPrimary: boolean; // placed in its natural (primary) position
};

const OUT_OF_POSITION_PENALTY = 4;
export const TOTAL_STEPS = FORMATION.length;
export const MAX_RESHUFFLES = 2;

export const ALL_PLAYERS = playersData as Player[];

const MIN_CLUB_PLAYERS = 6; // more than 5
const MIN_TOP_PLAYERS = 2; // at least 2 players with overall > 80
const TOP_OVERALL_THRESHOLD = 80;

const CLUBS = Array.from(new Set(ALL_PLAYERS.map((p) => p.club))).filter((club) => {
  const clubPlayers = ALL_PLAYERS.filter((p) => p.club === club);
  const topPlayers = clubPlayers.filter((p) => p.overall > TOP_OVERALL_THRESHOLD);
  return clubPlayers.length >= MIN_CLUB_PLAYERS && topPlayers.length >= MIN_TOP_PLAYERS;
});

// All slot types a player can fill (primary + alternate positions, mapped).
export function eligibleSlotTypes(player: Player): Set<SlotType> {
  const types = new Set<SlotType>();
  for (const pos of [player.position, ...player.alternatePositions]) {
    for (const t of slotsForPosition(pos)) types.add(t);
  }
  return types;
}

// Slot types covered by a player's PRIMARY position only.
function primarySlotTypes(player: Player): Set<SlotType> {
  return new Set(slotsForPosition(player.position));
}

export function eligibleOpenSlots(player: Player, openSlots: readonly Slot[]): Slot[] {
  const types = eligibleSlotTypes(player);
  return openSlots.filter((s) => types.has(s.type));
}

function canFillAnyOpenSlot(player: Player, openSlots: readonly Slot[]): boolean {
  const types = eligibleSlotTypes(player);
  return openSlots.some((s) => types.has(s.type));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type Step = {
  readonly club: string;
  readonly players: Player[]; // all selectable players from the club for this step
};

// Pick a random club that has at least one available player able to fill an open slot.
export function nextStep(usedPlayerIds: ReadonlySet<number>, openSlots: readonly Slot[]): Step {
  const candidateClubs = shuffle(CLUBS);
  for (const club of candidateClubs) {
    const players = ALL_PLAYERS.filter((p) => p.club === club && !usedPlayerIds.has(p.id));
    if (players.some((p) => canFillAnyOpenSlot(p, openSlots))) {
      return { club, players: players.sort((a, b) => b.overall - a.overall) };
    }
  }
  // Fallback (should not happen): any club with available players.
  const club = candidateClubs[0];
  const players = ALL_PLAYERS.filter((p) => p.club === club && !usedPlayerIds.has(p.id)).sort((a, b) => b.overall - a.overall);
  return { club, players };
}

export function isPrimaryFit(player: Player, slotType: SlotType): boolean {
  return primarySlotTypes(player).has(slotType);
}

export function gradeSquad(placements: readonly Placement[]): number {
  if (placements.length === 0) return 0;
  const total = placements.reduce((sum, p) => sum + p.player.overall - (p.viaPrimary ? 0 : OUT_OF_POSITION_PENALTY), 0);
  const avg = total / placements.length;
  return Math.max(0, Math.min(100, Math.round((avg / 99) * 100)));
}

export function gradeLabel(grade: number): string {
  if (grade >= 90) return 'World Class 🏆';
  if (grade >= 82) return 'Outstanding ⭐️';
  if (grade >= 74) return 'Great 💪';
  if (grade >= 65) return 'Solid 👍';
  if (grade >= 55) return 'Decent 🙂';
  return 'Needs work 😅';
}
