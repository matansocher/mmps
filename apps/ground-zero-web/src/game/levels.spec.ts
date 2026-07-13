import { describe, expect, it } from 'vitest';
import { FLOOR_DEFINITIONS, FLOORS, parseFloor } from './levels';
import type { ParsedFloor, Position, TileType } from './types';

function findTile(floor: ParsedFloor, type: TileType): Position {
  for (let row = 0; row < floor.height; row += 1) {
    for (let column = 0; column < floor.width; column += 1) {
      if (floor.tiles[row][column].type === type) return { row, column };
    }
  }
  throw new Error(`Missing tile '${type}'`);
}

function canReach(floor: ParsedFloor, start: Position, target: Position): boolean {
  const queue: Position[] = [start];
  const visited = new Set([`${start.row}:${start.column}`]);
  const deltas = [
    { row: -1, column: 0 },
    { row: 1, column: 0 },
    { row: 0, column: -1 },
    { row: 0, column: 1 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.row === target.row && current.column === target.column) return true;
    for (const delta of deltas) {
      const next = { row: current.row + delta.row, column: current.column + delta.column };
      const key = `${next.row}:${next.column}`;
      if (visited.has(key) || floor.tiles[next.row]?.[next.column]?.type === 'wall' || !floor.tiles[next.row]?.[next.column]) continue;
      visited.add(key);
      queue.push(next);
    }
  }

  return false;
}

describe('floor definitions', () => {
  it('parses all five handcrafted floors', () => {
    expect(FLOORS).toHaveLength(5);
    expect(FLOORS.map((floor) => floor.id)).toEqual(FLOOR_DEFINITIONS.map((floor) => floor.id));
    expect(FLOORS.every((floor) => floor.width === 25 && floor.height === 17)).toEqual(true);
  });

  it('keeps every objective and exit reachable', () => {
    for (const floor of FLOORS) {
      const objective = findTile(floor, 'objective');
      const exit = findTile(floor, 'exit');
      expect(canReach(floor, floor.playerStart, objective), `${floor.id} objective`).toEqual(true);
      expect(canReach(floor, objective, exit), `${floor.id} exit`).toEqual(true);
    }
  });

  it('rejects uneven floor rows', () => {
    expect(() =>
      parseFloor({
        id: 'invalid',
        name: 'Invalid',
        template: ['#####', '#POE#', '####'],
        guards: [],
        visionDepth: 3,
        guardMoveEveryTicks: 3,
      }),
    ).toThrow('rows must have equal width');
  });

  it('rejects patrol positions inside walls', () => {
    expect(() =>
      parseFloor({
        id: 'invalid',
        name: 'Invalid',
        template: ['#####', '#POE#', '#####'],
        guards: [{ id: 'guard', behavior: 'patrol', patrol: [{ row: 0, column: 0 }, { row: 1, column: 1 }] }],
        visionDepth: 3,
        guardMoveEveryTicks: 3,
      }),
    ).toThrow('invalid patrol position');
  });

  it('rejects vent pairs that do not point to vent tiles', () => {
    expect(() =>
      parseFloor({
        id: 'invalid-vents',
        name: 'Invalid vents',
        template: ['#######', '#POVE.#', '#.....#', '#######'],
        ventPairs: [{ first: { row: 1, column: 3 }, second: { row: 2, column: 3 } }],
        guards: [],
        visionDepth: 3,
        guardMoveEveryTicks: 3,
      }),
    ).toThrow('invalid vent pair');
  });
});
