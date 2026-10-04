import { useCallback } from 'react';
import { countryFocus } from '../game/countries';
import { type GameMode, gateFor } from '../game/modes';
import { flightNumber } from '../game/progression';
import type { EarthEngine } from '../globe/engine';

export function drawLeg({ countries, route }: EarthEngine, from: string | undefined, to: string): void {
  const a = from ? countries.byCode.get(from) : undefined;
  const b = countries.byCode.get(to);
  if (a && b && a !== b) route.addLeg(countryFocus(a), countryFocus(b));
}

export function useContinentOf({ countries }: EarthEngine): (code: string) => string | undefined {
  return useCallback((code: string) => countries.byCode.get(code)?.continent, [countries]);
}

export function flightCode(mode: GameMode): string {
  return mode.kind === 'daily' ? `FC ${flightNumber(mode.day)}` : `FC ${gateFor(mode)}`;
}
