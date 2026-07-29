import { MAX_SIGNINGS_PER_WINDOW, SALE_VALUE_COUNTER, SALE_VALUE_FLOOR, TRANSFER_WINDOWS } from '../constants';

export type OpenWindow = { readonly name: 'summer' | 'winter'; readonly from: number; readonly to: number };

// Returns the open transfer window for a given matchday, or null if closed.
export function openWindowForMatchday(matchday: number): OpenWindow | null {
  return TRANSFER_WINDOWS.find((w) => matchday >= w.from && matchday <= w.to) ?? null;
}

// Stable key for the currently open window (so per-window signing counters reset).
export function windowKey(seasonNumber: number, matchday: number): string | null {
  const w = openWindowForMatchday(matchday);
  return w ? `${seasonNumber}:${w.name}` : null;
}

// Budget tier by club overall (EUR). Bigger clubs get more to spend.
export function budgetForOverall(overall: number): number {
  if (overall >= 84) return 200_000_000;
  if (overall >= 81) return 120_000_000;
  if (overall >= 78) return 70_000_000;
  if (overall >= 75) return 40_000_000;
  return 20_000_000;
}

export type BidDecision = { readonly outcome: 'accept' | 'reject' | 'counter'; readonly counterAmount?: number };

// An AI seller's response to a bid for one of its players.
// - Accepts when the bid meets the value floor and the seller can spare the player.
// - Counters (once) when the bid is close but below value.
// - Rejects when far too low, or the squad is too thin to sell.
export function decideOnBid(params: { readonly bidAmount: number; readonly playerValue: number; readonly sellerSquadSize: number }): BidDecision {
  const { bidAmount, playerValue, sellerSquadSize } = params;
  if (sellerSquadSize <= 16) return { outcome: 'reject' }; // won't sell below a viable squad
  const floor = playerValue * SALE_VALUE_FLOOR;
  if (bidAmount >= floor) return { outcome: 'accept' };
  if (bidAmount >= playerValue * 0.6) return { outcome: 'counter', counterAmount: Math.round(playerValue * SALE_VALUE_COUNTER) };
  return { outcome: 'reject' };
}

// Whether a club may still sign in the open window.
export function canSign(signingsThisWindow: number): boolean {
  return signingsThisWindow < MAX_SIGNINGS_PER_WINDOW;
}

// Whether the buyer can afford a fee.
export function canAfford(budget: number, fee: number): boolean {
  return budget >= fee;
}
