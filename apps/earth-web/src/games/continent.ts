import { useCallback } from 'react';
import type { EarthEngine } from '../globe/engine';

export function useContinentOf({ countries }: EarthEngine): (code: string) => string | undefined {
  return useCallback((code: string) => countries.byCode.get(code)?.continent, [countries]);
}
