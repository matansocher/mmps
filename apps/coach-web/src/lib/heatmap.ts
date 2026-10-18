import type { Game } from '../types';

export const HOUR_MS = 60 * 60 * 1000;
export const GAME_SPAN_MS = 2 * HOUR_MS;

export type HeatSlot = {
  readonly start: number;
  readonly games: number;
  readonly live: number;
};

function kickoff(game: Game): number {
  return new Date(game.startTime).getTime();
}

export function isInSlot(game: Game, slotStart: number): boolean {
  const start = kickoff(game);
  return start < slotStart + HOUR_MS && start + GAME_SPAN_MS > slotStart;
}

// One-hour slots from the first kick-off hour to the end of the last game (~2h after its kick-off).
export function buildSlots(games: readonly Game[]): readonly HeatSlot[] {
  const starts = games.map(kickoff).filter((t) => Number.isFinite(t));
  if (!starts.length) return [];
  const first = new Date(Math.min(...starts));
  first.setMinutes(0, 0, 0);
  const end = Math.max(...starts) + GAME_SPAN_MS;
  const slots: HeatSlot[] = [];
  for (let start = first.getTime(); start < end; start += HOUR_MS) {
    const inSlot = games.filter((g) => isInSlot(g, start));
    slots.push({ start, games: inSlot.length, live: inSlot.filter((g) => g.status === 'live').length });
  }
  return slots;
}
