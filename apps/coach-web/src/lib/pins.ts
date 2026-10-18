const KEY_PREFIX = 'coach:pins:';

export const MAX_PINS = 3;

// Pins are stored per matchday (`coach:pins:2025-05-18`); reading one day drops every other day's pins.
export function readPins(date: string): number[] {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(KEY_PREFIX) && key !== KEY_PREFIX + date) localStorage.removeItem(key);
    }
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY_PREFIX + date) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number').slice(0, MAX_PINS) : [];
  } catch {
    return [];
  }
}

export function writePins(date: string, ids: readonly number[]): void {
  try {
    if (ids.length === 0) localStorage.removeItem(KEY_PREFIX + date);
    else localStorage.setItem(KEY_PREFIX + date, JSON.stringify(ids));
  } catch {
    // ignore unavailable storage
  }
}

export type PinResult = { readonly ids: number[]; readonly limitReached: boolean };

// Toggles a pin; pins of games no longer on today's list don't count towards the limit.
export function togglePin(current: readonly number[], id: number, available: ReadonlySet<number>): PinResult {
  if (current.includes(id)) return { ids: current.filter((p) => p !== id), limitReached: false };
  const kept = current.filter((p) => available.has(p));
  if (kept.length >= MAX_PINS) return { ids: [...current], limitReached: true };
  return { ids: [...kept, id], limitReached: false };
}
