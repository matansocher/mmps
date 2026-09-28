import { createContext, useContext } from 'react';
import type { RunMode } from '../lib/progress';
import type { RunClock } from '../lib/run-clock';

export type GameRuntime = { readonly clock: RunClock; readonly mode: RunMode; readonly day: string; readonly practice: boolean };
export const GameRuntimeContext = createContext<GameRuntime | null>(null);
export function useGameRuntime(): GameRuntime {
  const runtime = useContext(GameRuntimeContext);
  if (!runtime) throw new Error('Game runtime missing');
  return runtime;
}
