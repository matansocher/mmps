import { tileAt } from './levels';
import type { Direction, GameState, GuardState, ParsedFloor, PatrolGuardState, Position, SentryGuardState, StepResult } from './types';
import { detectingGuards, positionsEqual } from './vision';

const DIRECTION_DELTAS: Readonly<Record<Direction, Position>> = {
  up: { row: -1, column: 0 },
  right: { row: 0, column: 1 },
  down: { row: 1, column: 0 },
  left: { row: 0, column: -1 },
};

function directionBetween(from: Position, to: Position): Direction {
  if (to.row < from.row) return 'up';
  if (to.row > from.row) return 'down';
  if (to.column < from.column) return 'left';
  return 'right';
}

export function createGameState(floor: ParsedFloor): GameState {
  return {
    floor,
    tick: 0,
    status: 'ready',
    player: {
      position: floor.playerStart,
      direction: 'up',
      hasObjective: false,
      hasKeycard: false,
      isHidden: tileAt(floor, floor.playerStart)?.type === 'hiding',
    },
    guards: floor.guards.map((guard): GuardState => {
      if (guard.behavior === 'sentry') {
        return {
          id: guard.id,
          behavior: guard.behavior,
          position: guard.position,
          direction: guard.facingSequence[0],
          facingSequence: guard.facingSequence,
          facingIndex: 0,
          rotateEveryTicks: guard.rotateEveryTicks,
          mode: 'routine',
          homePosition: guard.position,
          investigationTarget: null,
          searchTicksRemaining: 0,
        };
      }
      return {
        id: guard.id,
        behavior: guard.behavior,
        position: guard.patrol[0],
        direction: directionBetween(guard.patrol[0], guard.patrol[1]),
        patrol: guard.patrol,
        patrolIndex: 0,
        patrolDirection: 1,
        moveEveryTicks: guard.moveEveryTicks ?? floor.guardMoveEveryTicks,
        mode: 'routine',
        homePosition: guard.patrol[0],
        investigationTarget: null,
        searchTicksRemaining: 0,
      };
    }),
    suspicion: 0,
    noise: null,
    interaction: null,
    startedAt: null,
    completedAt: null,
  };
}

export function resetGame(state: GameState): GameState {
  return createGameState(state.floor);
}

function movePlayer(state: GameState, direction: Direction | null) {
  if (!direction) return { player: state.player, doorBlocked: false, ventUsed: false };
  const delta = DIRECTION_DELTAS[direction];
  const target = {
    row: state.player.position.row + delta.row,
    column: state.player.position.column + delta.column,
  };
  const tile = tileAt(state.floor, target);
  if (!tile || tile.type === 'wall') return { player: { ...state.player, direction }, doorBlocked: false, ventUsed: false };
  if (tile.type === 'door' && !state.player.hasKeycard) return { player: { ...state.player, direction }, doorBlocked: true, ventUsed: false };

  const hasObjective = state.player.hasObjective || tile.type === 'objective';
  const hasKeycard = state.player.hasKeycard || tile.type === 'keycard';
  const ventDestination = tile.type === 'vent' ? state.floor.ventLinks[`${target.row}:${target.column}`] : null;
  return {
    player: {
      position: ventDestination ?? target,
      direction,
      hasObjective,
      hasKeycard,
      isHidden: tile.type === 'hiding',
    },
    doorBlocked: false,
    ventUsed: Boolean(ventDestination),
  };
}

function movePatrolGuard(guard: PatrolGuardState): PatrolGuardState {
  let nextIndex = guard.patrolIndex + guard.patrolDirection;
  let nextPatrolDirection = guard.patrolDirection;

  if (nextIndex < 0 || nextIndex >= guard.patrol.length) {
    nextPatrolDirection = guard.patrolDirection === 1 ? -1 : 1;
    nextIndex = guard.patrolIndex + nextPatrolDirection;
  }

  const nextPosition = guard.patrol[nextIndex];
  return {
    ...guard,
    position: nextPosition,
    direction: directionBetween(guard.position, nextPosition),
    patrolIndex: nextIndex,
    patrolDirection: nextPatrolDirection,
  };
}

function rotateSentryGuard(guard: SentryGuardState): SentryGuardState {
  const facingIndex = (guard.facingIndex + 1) % guard.facingSequence.length;
  return {
    ...guard,
    direction: guard.facingSequence[facingIndex],
    facingIndex,
  };
}

function updateRoutineGuard(guard: GuardState, tick: number): GuardState {
  if (guard.behavior === 'sentry') return tick % guard.rotateEveryTicks === 0 ? rotateSentryGuard(guard) : guard;
  return tick % guard.moveEveryTicks === 0 ? movePatrolGuard(guard) : guard;
}

function manhattanDistance(left: Position, right: Position): number {
  return Math.abs(left.row - right.row) + Math.abs(left.column - right.column);
}

function nextStepToward(floor: ParsedFloor, start: Position, target: Position): Position | null {
  if (positionsEqual(start, target)) return start;
  const queue: Position[] = [start];
  const visited = new Set([`${start.row}:${start.column}`]);
  const previous = new Map<string, Position>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const delta of Object.values(DIRECTION_DELTAS)) {
      const next = { row: current.row + delta.row, column: current.column + delta.column };
      const key = `${next.row}:${next.column}`;
      const tile = tileAt(floor, next);
      if (!tile || tile.type === 'wall' || tile.type === 'door' || visited.has(key)) continue;
      visited.add(key);
      previous.set(key, current);

      if (positionsEqual(next, target)) {
        let step = next;
        let parent = previous.get(`${step.row}:${step.column}`);
        while (parent && !positionsEqual(parent, start)) {
          step = parent;
          parent = previous.get(`${step.row}:${step.column}`);
        }
        return step;
      }
      queue.push(next);
    }
  }

  return null;
}

function moveGuardToward(guard: GuardState, target: Position, floor: ParsedFloor): GuardState {
  const next = nextStepToward(floor, guard.position, target);
  if (!next || positionsEqual(next, guard.position)) return guard;
  return {
    ...guard,
    position: next,
    direction: directionBetween(guard.position, next),
  };
}

function guardMoveInterval(guard: GuardState): number {
  return guard.behavior === 'patrol' ? guard.moveEveryTicks : Math.max(2, Math.min(3, guard.rotateEveryTicks));
}

function beginInvestigation(guard: GuardState, target: Position): GuardState {
  return {
    ...guard,
    mode: 'investigate',
    investigationTarget: target,
    searchTicksRemaining: 0,
  };
}

function returnToRoutine(guard: GuardState): GuardState {
  if (guard.behavior === 'sentry') {
    return {
      ...guard,
      mode: 'routine',
      direction: guard.facingSequence[0],
      facingIndex: 0,
      investigationTarget: null,
      searchTicksRemaining: 0,
    };
  }
  return {
    ...guard,
    mode: 'routine',
    position: guard.homePosition,
    direction: directionBetween(guard.patrol[0], guard.patrol[1]),
    patrolIndex: 0,
    patrolDirection: 1,
    investigationTarget: null,
    searchTicksRemaining: 0,
  };
}

function rotateSearchDirection(direction: Direction): Direction {
  const directions: readonly Direction[] = ['up', 'right', 'down', 'left'];
  return directions[(directions.indexOf(direction) + 1) % directions.length];
}

function updateGuard(guard: GuardState, state: GameState, tick: number): GuardState {
  if (guard.mode === 'routine') return updateRoutineGuard(guard, tick);

  if (guard.mode === 'investigate') {
    const target = guard.investigationTarget;
    if (!target || positionsEqual(guard.position, target)) {
      return {
        ...guard,
        mode: 'search',
        investigationTarget: null,
        searchTicksRemaining: state.floor.searchDurationTicks,
      };
    }
    if (tick % guardMoveInterval(guard) !== 0) return guard;
    const moved = moveGuardToward(guard, target, state.floor);
    if (!positionsEqual(moved.position, target)) return moved;
    return {
      ...moved,
      mode: 'search',
      investigationTarget: null,
      searchTicksRemaining: state.floor.searchDurationTicks,
    };
  }

  if (guard.mode === 'search') {
    const searchTicksRemaining = guard.searchTicksRemaining - 1;
    if (searchTicksRemaining <= 0) {
      return {
        ...guard,
        mode: 'return',
        searchTicksRemaining: 0,
      };
    }
    return {
      ...guard,
      direction: tick % 2 === 0 ? rotateSearchDirection(guard.direction) : guard.direction,
      searchTicksRemaining,
    };
  }

  if (positionsEqual(guard.position, guard.homePosition)) return returnToRoutine(guard);
  if (tick % guardMoveInterval(guard) !== 0) return guard;
  const moved = moveGuardToward(guard, guard.homePosition, state.floor);
  return positionsEqual(moved.position, guard.homePosition) ? returnToRoutine(moved) : moved;
}

export function stepGame(state: GameState, direction: Direction | null, now = Date.now()): StepResult {
  if (state.status === 'caught' || state.status === 'completed') {
    return { state, objectiveCollected: false, keycardCollected: false, ventUsed: false, doorBlocked: false };
  }

  const previousObjective = state.player.hasObjective;
  const previousKeycard = state.player.hasKeycard;
  const movement = movePlayer(state, direction);
  const player = movement.player;
  const tick = state.tick + 1;
  const playerMoved = !positionsEqual(player.position, state.player.position);
  const noise = playerMoved
    ? {
        position: player.position,
        radius: state.floor.playerNoiseRadius,
        expiresAtTick: tick + 2,
      }
    : state.noise && state.noise.expiresAtTick >= tick
      ? state.noise
      : null;
  const alertedGuards = noise
    ? state.guards.map((guard) => (manhattanDistance(guard.position, noise.position) <= noise.radius && guard.mode !== 'search' ? beginInvestigation(guard, noise.position) : guard))
    : state.guards;
  const guards = alertedGuards.map((guard) => updateGuard(guard, state, tick));
  const startedAt = state.startedAt ?? now;
  const interaction = movement.doorBlocked
    ? { kind: 'door-locked' as const, tick }
    : movement.ventUsed
      ? { kind: 'vent' as const, tick }
      : !previousKeycard && player.hasKeycard
        ? { kind: 'keycard' as const, tick }
        : state.interaction && tick - state.interaction.tick <= 6
          ? state.interaction
          : null;
  let nextState: GameState = {
    ...state,
    tick,
    status: 'playing',
    player,
    guards,
    noise,
    interaction,
    startedAt,
  };

  const observers = detectingGuards(nextState);
  const collision = nextState.guards.some((guard) => positionsEqual(guard.position, player.position));
  const suspicion = collision
    ? 100
    : observers.length > 0
      ? Math.min(100, state.suspicion + state.floor.suspicionPerTick + Math.max(0, observers.length - 1) * 5)
      : Math.max(0, state.suspicion - state.floor.suspicionDecayPerTick);
  const observerIds = new Set(observers.map((guard) => guard.id));
  const awareGuards = nextState.guards.map((guard) => (observerIds.has(guard.id) ? beginInvestigation(guard, player.position) : guard));
  nextState = {
    ...nextState,
    guards: awareGuards,
    suspicion,
  };

  if (suspicion >= 100) {
    nextState = { ...nextState, status: 'caught', suspicion: 100 };
    return {
      state: nextState,
      objectiveCollected: !previousObjective && player.hasObjective,
      keycardCollected: !previousKeycard && player.hasKeycard,
      ventUsed: movement.ventUsed,
      doorBlocked: movement.doorBlocked,
    };
  }

  const tile = tileAt(state.floor, player.position);
  if (tile?.type === 'exit' && player.hasObjective) {
    nextState = { ...nextState, status: 'completed', completedAt: now };
  }

  return {
    state: nextState,
    objectiveCollected: !previousObjective && player.hasObjective,
    keycardCollected: !previousKeycard && player.hasKeycard,
    ventUsed: movement.ventUsed,
    doorBlocked: movement.doorBlocked,
  };
}

export function elapsedMs(state: GameState, now = Date.now()): number {
  if (!state.startedAt) return 0;
  return (state.completedAt ?? now) - state.startedAt;
}

export function isExitLocked(state: GameState, position: Position): boolean {
  return tileAt(state.floor, position)?.type === 'exit' && !state.player.hasObjective;
}

export function guardAt(state: GameState, position: Position): GuardState | null {
  return state.guards.find((guard) => positionsEqual(guard.position, position)) ?? null;
}
