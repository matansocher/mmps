import { createState, step } from './engine';
import type { GameState, Level, StepAction } from './types';

export type Session = {
  readonly state: GameState;
  readonly history: readonly GameState[];
  readonly actions: readonly StepAction[];
};
export type GameAction = StepAction | { readonly type: 'undo' } | { readonly type: 'restart' };

export function createSession(level: Level): Session {
  return { state: createState(level), history: [], actions: [] };
}

export function reduceSession(session: Session, action: GameAction): Session {
  if (action.type === 'restart') return createSession(session.state.level);
  if (action.type === 'undo') {
    const state = session.history.at(-1);
    return state ? { state, history: session.history.slice(0, -1), actions: session.actions.slice(0, -1) } : session;
  }
  const state = step(session.state, action);
  return state === session.state ? session : { state, history: [...session.history, session.state], actions: [...session.actions, action] };
}
