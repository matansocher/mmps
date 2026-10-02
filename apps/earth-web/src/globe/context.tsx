import { createContext, useContext } from 'react';
import type { EarthEngine } from './engine';

export const EngineContext = createContext<EarthEngine | null>(null);

export function useEngine(): EarthEngine {
  const engine = useContext(EngineContext);
  if (!engine) throw new Error('useEngine must be used inside EngineContext');
  return engine;
}
