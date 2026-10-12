import { availableInteractions, createState, step } from './engine';
import { DIRECTIONS } from './types';
import type { GameState, Level, StepAction } from './types';

export type SearchResult = { readonly status: 'solved'; readonly actions: readonly StepAction[]; readonly visited: number } | { readonly status: 'unsolvable' | 'exhausted'; readonly visited: number };

export function stateKey(state: GameState): string {
  return JSON.stringify([
    state.player,
    [...state.crates].sort((a, b) => a - b),
    [...state.keys].sort(),
    [...state.collectedKeys].sort((a, b) => a - b),
    [...state.unlockedLocks].sort((a, b) => a - b),
    [...state.collapsed].sort((a, b) => a - b),
    [...state.flippedBridges].sort((a, b) => a - b),
    [...state.flippedMirrors].sort((a, b) => a - b),
    state.leverOn,
  ]);
}

export function solve(level: Level, maxNodes = 250_000, canVisit?: (state: GameState) => boolean): SearchResult {
  return solveFromState(createState(level), maxNodes, canVisit);
}

export function solveFromState(start: GameState, maxNodes = 250_000, canVisit?: (state: GameState) => boolean): SearchResult {
  if (canVisit && !canVisit(start)) return { status: 'unsolvable', visited: 0 };
  const queue: { readonly state: GameState; readonly parent: number; readonly action?: StepAction }[] = [{ state: start, parent: -1 }];
  const seen = new Set([stateKey(start)]);
  for (let head = 0; head < queue.length; head++) {
    if (head >= maxNodes) return { status: 'exhausted', visited: head };
    const { state } = queue[head];
    if (state.won) {
      const actions: StepAction[] = [];
      for (let cursor = head; queue[cursor].action; cursor = queue[cursor].parent) actions.push(queue[cursor].action!);
      return { status: 'solved', actions: actions.reverse(), visited: head + 1 };
    }
    const actions: StepAction[] = [...DIRECTIONS.map((move): StepAction => ({ type: 'move', move })), ...availableInteractions(state).map((position): StepAction => ({ type: 'interact', position }))];
    for (const action of actions) {
      const next = step(state, action);
      if (canVisit && !canVisit(next)) continue;
      const key = stateKey(next);
      if (!seen.has(key)) {
        seen.add(key);
        queue.push({ state: next, parent: head, action });
      }
    }
  }
  return { status: 'unsolvable', visited: queue.length };
}

export function replaySolution(level: Level, actions: readonly StepAction[]): GameState {
  return actions.reduce(step, createState(level));
}
