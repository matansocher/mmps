import { tileAt } from './levels';
import type { Direction, GameState, GuardState, Position } from './types';

const DIRECTION_DELTAS: Readonly<Record<Direction, Position>> = {
  up: { row: -1, column: 0 },
  right: { row: 0, column: 1 },
  down: { row: 1, column: 0 },
  left: { row: 0, column: -1 },
};

export function positionsEqual(left: Position, right: Position): boolean {
  return left.row === right.row && left.column === right.column;
}

function isInsideVisionCone(origin: Position, target: Position, direction: Direction, depth: number): boolean {
  const deltaRow = target.row - origin.row;
  const deltaColumn = target.column - origin.column;
  const forward = DIRECTION_DELTAS[direction];
  const forwardDistance = deltaRow * forward.row + deltaColumn * forward.column;
  const lateralDistance = Math.abs(deltaRow * forward.column - deltaColumn * forward.row);
  return forwardDistance > 0 && forwardDistance <= depth && lateralDistance <= forwardDistance;
}

function lineBetween(origin: Position, target: Position): readonly Position[] {
  const cells: Position[] = [];
  let column = origin.column;
  let row = origin.row;
  const deltaColumn = Math.abs(target.column - origin.column);
  const deltaRow = Math.abs(target.row - origin.row);
  const stepColumn = origin.column < target.column ? 1 : -1;
  const stepRow = origin.row < target.row ? 1 : -1;
  let error = deltaColumn - deltaRow;

  while (column !== target.column || row !== target.row) {
    const doubledError = error * 2;
    if (doubledError > -deltaRow) {
      error -= deltaRow;
      column += stepColumn;
    }
    if (doubledError < deltaColumn) {
      error += deltaColumn;
      row += stepRow;
    }
    cells.push({ row, column });
  }

  return cells;
}

function hasLineOfSight(state: GameState, origin: Position, target: Position): boolean {
  const line = lineBetween(origin, target);
  return line.every((position) => {
    const type = tileAt(state.floor, position)?.type;
    return type !== 'wall' && (type !== 'door' || state.player.hasKeycard);
  });
}

export function visionTiles(state: GameState, guard: GuardState): readonly Position[] {
  const visible: Position[] = [];

  for (let row = guard.position.row - state.floor.visionDepth; row <= guard.position.row + state.floor.visionDepth; row += 1) {
    for (let column = guard.position.column - state.floor.visionDepth; column <= guard.position.column + state.floor.visionDepth; column += 1) {
      const target = { row, column };
      const tile = tileAt(state.floor, target);
      if (!tile || tile.type === 'wall' || !isInsideVisionCone(guard.position, target, guard.direction, state.floor.visionDepth)) continue;
      if (hasLineOfSight(state, guard.position, target)) visible.push(target);
    }
  }

  return visible.sort((left, right) => {
    const leftDistance = Math.abs(left.row - guard.position.row) + Math.abs(left.column - guard.position.column);
    const rightDistance = Math.abs(right.row - guard.position.row) + Math.abs(right.column - guard.position.column);
    return leftDistance - rightDistance || left.row - right.row || left.column - right.column;
  });
}

export function isPlayerDetected(state: GameState): boolean {
  return detectingGuards(state).length > 0;
}

export function detectingGuards(state: GameState): readonly GuardState[] {
  if (state.player.isHidden) return [];
  return state.guards.filter((guard) => positionsEqual(guard.position, state.player.position) || visionTiles(state, guard).some((target) => positionsEqual(target, state.player.position)));
}
