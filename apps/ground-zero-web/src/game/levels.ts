import type { FloorDefinition, ParsedFloor, Position, Tile, TileType } from './types';

const SYMBOLS: Readonly<Record<string, TileType>> = {
  '.': 'empty',
  '#': 'wall',
  P: 'empty',
  O: 'objective',
  E: 'exit',
  H: 'hiding',
  K: 'keycard',
  D: 'door',
  V: 'vent',
};

function position(row: number, column: number): Position {
  return { row, column };
}

type WallArea = {
  readonly from: Position;
  readonly to: Position;
};

type TemplateOptions = {
  readonly player: Position;
  readonly objective: Position;
  readonly exit: Position;
  readonly hidingSpots: readonly Position[];
  readonly walls: readonly WallArea[];
  readonly keycard?: Position;
  readonly doors?: readonly Position[];
  readonly ventPairs?: readonly { readonly first: Position; readonly second: Position }[];
};

function area(fromRow: number, fromColumn: number, toRow: number, toColumn: number): WallArea {
  return {
    from: position(fromRow, fromColumn),
    to: position(toRow, toColumn),
  };
}

function createTemplate(options: TemplateOptions, width = 25, height = 17): readonly string[] {
  const grid: string[][] = Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, column) => (row === 0 || column === 0 || row === height - 1 || column === width - 1 ? '#' : '.')),
  );

  for (const wall of options.walls) {
    for (let row = wall.from.row; row <= wall.to.row; row += 1) {
      for (let column = wall.from.column; column <= wall.to.column; column += 1) {
        grid[row][column] = '#';
      }
    }
  }

  for (const hidingSpot of options.hidingSpots) grid[hidingSpot.row][hidingSpot.column] = 'H';
  if (options.keycard) grid[options.keycard.row][options.keycard.column] = 'K';
  for (const door of options.doors ?? []) grid[door.row][door.column] = 'D';
  for (const pair of options.ventPairs ?? []) {
    grid[pair.first.row][pair.first.column] = 'V';
    grid[pair.second.row][pair.second.column] = 'V';
  }
  grid[options.player.row][options.player.column] = 'P';
  grid[options.objective.row][options.objective.column] = 'O';
  grid[options.exit.row][options.exit.column] = 'E';
  return grid.map((row) => row.join(''));
}

export const FLOOR_DEFINITIONS: readonly FloorDefinition[] = [
  {
    id: 'floor-01',
    name: 'The Lobby',
    template: createTemplate({
      player: position(1, 1),
      objective: position(15, 12),
      exit: position(1, 23),
      hidingSpots: [position(7, 4), position(11, 19)],
      keycard: position(3, 3),
      doors: [position(5, 6)],
      ventPairs: [{ first: position(3, 5), second: position(6, 7) }],
      walls: [
        area(2, 6, 5, 6),
        area(8, 6, 13, 6),
        area(2, 17, 6, 17),
        area(9, 17, 14, 17),
        area(5, 1, 5, 4),
        area(5, 8, 5, 14),
        area(5, 20, 5, 23),
        area(10, 2, 10, 8),
        area(10, 11, 10, 15),
        area(10, 19, 10, 22),
        area(13, 9, 13, 14),
      ],
    }),
    ventPairs: [{ first: position(3, 5), second: position(6, 7) }],
    guards: [
      { id: 'guard-01', behavior: 'patrol', patrol: [position(3, 8), position(3, 10), position(3, 12), position(3, 14)] },
      { id: 'guard-02', behavior: 'sentry', position: position(7, 12), facingSequence: ['left', 'up', 'right'], rotateEveryTicks: 5 },
      { id: 'guard-03', behavior: 'patrol', patrol: [position(13, 19), position(13, 21), position(13, 23)], moveEveryTicks: 4 },
    ],
    visionDepth: 5,
    guardMoveEveryTicks: 3,
    suspicionPerTick: 20,
    suspicionDecayPerTick: 14,
    playerNoiseRadius: 3,
    searchDurationTicks: 8,
  },
  {
    id: 'floor-02',
    name: 'Records',
    template: createTemplate({
      player: position(15, 1),
      objective: position(2, 21),
      exit: position(15, 23),
      hidingSpots: [position(3, 3), position(8, 12), position(13, 20)],
      walls: [
        area(1, 5, 6, 5),
        area(9, 5, 14, 5),
        area(2, 10, 4, 10),
        area(7, 10, 13, 10),
        area(3, 15, 8, 15),
        area(11, 15, 15, 15),
        area(6, 1, 6, 3),
        area(6, 7, 6, 12),
        area(6, 18, 6, 23),
        area(11, 2, 11, 8),
        area(11, 12, 11, 13),
        area(11, 18, 11, 22),
      ],
    }),
    guards: [
      { id: 'guard-01', behavior: 'patrol', patrol: [position(2, 12), position(2, 14), position(2, 16), position(2, 18)] },
      { id: 'guard-02', behavior: 'sentry', position: position(8, 7), facingSequence: ['up', 'right', 'down', 'left'], rotateEveryTicks: 6 },
      { id: 'guard-03', behavior: 'patrol', patrol: [position(13, 7), position(13, 9), position(13, 11), position(13, 13)] },
      { id: 'guard-04', behavior: 'sentry', position: position(9, 20), facingSequence: ['left', 'up', 'right'], rotateEveryTicks: 4 },
    ],
    visionDepth: 5,
    guardMoveEveryTicks: 3,
    suspicionPerTick: 22,
    suspicionDecayPerTick: 13,
    playerNoiseRadius: 3,
    searchDurationTicks: 9,
  },
  {
    id: 'floor-03',
    name: 'Cold Storage',
    template: createTemplate({
      player: position(1, 1),
      objective: position(14, 21),
      exit: position(1, 23),
      hidingSpots: [position(4, 8), position(9, 3), position(12, 18)],
      walls: [
        area(2, 4, 7, 4),
        area(10, 4, 14, 4),
        area(1, 9, 4, 9),
        area(7, 9, 12, 9),
        area(4, 14, 9, 14),
        area(12, 14, 15, 14),
        area(4, 19, 6, 19),
        area(9, 19, 13, 19),
        area(7, 1, 7, 2),
        area(7, 6, 7, 7),
        area(7, 11, 7, 12),
        area(7, 16, 7, 17),
        area(7, 21, 7, 23),
        area(12, 6, 12, 7),
        area(12, 11, 12, 12),
        area(12, 21, 12, 23),
      ],
    }),
    guards: [
      { id: 'guard-01', behavior: 'patrol', patrol: [position(3, 1), position(3, 2), position(3, 3)] },
      { id: 'guard-02', behavior: 'sentry', position: position(5, 11), facingSequence: ['down', 'left', 'up'], rotateEveryTicks: 5 },
      { id: 'guard-03', behavior: 'patrol', patrol: [position(10, 15), position(10, 16), position(10, 17), position(10, 18)] },
      { id: 'guard-04', behavior: 'sentry', position: position(14, 8), facingSequence: ['left', 'up', 'right'], rotateEveryTicks: 4 },
    ],
    visionDepth: 6,
    guardMoveEveryTicks: 3,
    suspicionPerTick: 24,
    suspicionDecayPerTick: 12,
    playerNoiseRadius: 4,
    searchDurationTicks: 10,
  },
  {
    id: 'floor-04',
    name: 'Operations',
    template: createTemplate({
      player: position(8, 1),
      objective: position(2, 22),
      exit: position(15, 23),
      hidingSpots: [position(2, 3), position(8, 12), position(14, 17)],
      walls: [
        area(1, 6, 5, 6),
        area(8, 6, 15, 6),
        area(3, 11, 8, 11),
        area(11, 11, 14, 11),
        area(1, 17, 4, 17),
        area(7, 17, 12, 17),
        area(4, 1, 4, 4),
        area(4, 8, 4, 9),
        area(4, 13, 4, 15),
        area(4, 20, 4, 23),
        area(9, 2, 9, 4),
        area(9, 8, 9, 9),
        area(9, 13, 9, 15),
        area(13, 1, 13, 4),
        area(13, 8, 13, 9),
        area(13, 13, 13, 15),
        area(13, 20, 13, 23),
      ],
    }),
    guards: [
      { id: 'guard-01', behavior: 'sentry', position: position(2, 8), facingSequence: ['left', 'down', 'right'], rotateEveryTicks: 4 },
      { id: 'guard-02', behavior: 'patrol', patrol: [position(6, 13), position(6, 14), position(6, 15), position(6, 16)] },
      { id: 'guard-03', behavior: 'sentry', position: position(8, 20), facingSequence: ['up', 'left', 'down'], rotateEveryTicks: 5 },
      { id: 'guard-04', behavior: 'patrol', patrol: [position(11, 1), position(11, 2), position(11, 3), position(11, 4)] },
      { id: 'guard-05', behavior: 'patrol', patrol: [position(15, 13), position(15, 15), position(15, 17), position(15, 19)] },
    ],
    visionDepth: 6,
    guardMoveEveryTicks: 3,
    suspicionPerTick: 26,
    suspicionDecayPerTick: 11,
    playerNoiseRadius: 4,
    searchDurationTicks: 11,
  },
  {
    id: 'floor-05',
    name: 'Ground Zero',
    template: createTemplate({
      player: position(15, 1),
      objective: position(1, 12),
      exit: position(15, 23),
      hidingSpots: [position(3, 3), position(8, 7), position(8, 18), position(13, 12)],
      walls: [
        area(2, 5, 6, 5),
        area(9, 5, 14, 5),
        area(1, 9, 4, 9),
        area(7, 9, 12, 9),
        area(2, 15, 6, 15),
        area(9, 15, 14, 15),
        area(5, 19, 10, 19),
        area(4, 1, 4, 3),
        area(4, 7, 4, 7),
        area(4, 11, 4, 13),
        area(4, 17, 4, 17),
        area(4, 21, 4, 23),
        area(8, 2, 8, 3),
        area(8, 11, 8, 13),
        area(8, 21, 8, 22),
        area(12, 1, 12, 3),
        area(12, 7, 12, 7),
        area(12, 11, 12, 13),
        area(12, 17, 12, 17),
        area(12, 21, 12, 23),
      ],
    }),
    guards: [
      { id: 'guard-01', behavior: 'sentry', position: position(2, 3), facingSequence: ['right', 'down', 'left'], rotateEveryTicks: 4 },
      { id: 'guard-02', behavior: 'patrol', patrol: [position(2, 17), position(2, 19), position(2, 21), position(2, 23)], moveEveryTicks: 2 },
      { id: 'guard-03', behavior: 'sentry', position: position(6, 12), facingSequence: ['left', 'up', 'right', 'down'], rotateEveryTicks: 4 },
      { id: 'guard-04', behavior: 'patrol', patrol: [position(10, 1), position(10, 2), position(10, 3), position(10, 4)], moveEveryTicks: 2 },
      { id: 'guard-05', behavior: 'sentry', position: position(10, 17), facingSequence: ['up', 'left', 'down'], rotateEveryTicks: 3 },
      { id: 'guard-06', behavior: 'patrol', patrol: [position(14, 17), position(14, 19), position(14, 21), position(14, 23)], moveEveryTicks: 2 },
    ],
    visionDepth: 6,
    guardMoveEveryTicks: 2,
    suspicionPerTick: 28,
    suspicionDecayPerTick: 10,
    playerNoiseRadius: 5,
    searchDurationTicks: 12,
  },
];

export function parseFloor(definition: FloorDefinition): ParsedFloor {
  const height = definition.template.length;
  const width = definition.template[0]?.length ?? 0;
  if (height === 0 || width === 0) throw new Error(`Floor '${definition.id}' must not be empty`);
  if (definition.template.some((row) => row.length !== width)) throw new Error(`Floor '${definition.id}' rows must have equal width`);

  let playerStart: Position | null = null;
  let objectiveCount = 0;
  let exitCount = 0;

  const tiles = definition.template.map((row, rowIndex) =>
    [...row].map((symbol, columnIndex): Tile => {
      const type = SYMBOLS[symbol];
      if (!type) throw new Error(`Floor '${definition.id}' has unknown symbol '${symbol}'`);
      if (symbol === 'P') {
        if (playerStart) throw new Error(`Floor '${definition.id}' must have exactly one player start`);
        playerStart = position(rowIndex, columnIndex);
      }
      if (symbol === 'O') objectiveCount += 1;
      if (symbol === 'E') exitCount += 1;
      return { type };
    }),
  );

  if (!playerStart) throw new Error(`Floor '${definition.id}' must have a player start`);
  if (objectiveCount !== 1) throw new Error(`Floor '${definition.id}' must have exactly one objective`);
  if (exitCount !== 1) throw new Error(`Floor '${definition.id}' must have exactly one exit`);

  for (const guard of definition.guards) {
    if (guard.behavior === 'sentry') {
      const tile = tiles[guard.position.row]?.[guard.position.column];
      if (!tile || tile.type === 'wall') throw new Error(`Guard '${guard.id}' has an invalid sentry position`);
      if (guard.facingSequence.length < 2 || guard.rotateEveryTicks < 1) throw new Error(`Guard '${guard.id}' has an invalid sentry configuration`);
    } else {
      if (guard.patrol.length < 2) throw new Error(`Guard '${guard.id}' must have at least two patrol positions`);
      for (const patrolPosition of guard.patrol) {
        const tile = tiles[patrolPosition.row]?.[patrolPosition.column];
        if (!tile || tile.type === 'wall') throw new Error(`Guard '${guard.id}' has an invalid patrol position`);
      }

    }
  }

  const ventLinks: Record<string, Position> = {};
  for (const pair of definition.ventPairs ?? []) {
    const firstTile = tiles[pair.first.row]?.[pair.first.column];
    const secondTile = tiles[pair.second.row]?.[pair.second.column];
    if (firstTile?.type !== 'vent' || secondTile?.type !== 'vent') throw new Error(`Floor '${definition.id}' has an invalid vent pair`);
    ventLinks[`${pair.first.row}:${pair.first.column}`] = pair.second;
    ventLinks[`${pair.second.row}:${pair.second.column}`] = pair.first;
  }

  return {
    id: definition.id,
    name: definition.name,
    width,
    height,
    tiles,
    playerStart,
    guards: definition.guards,
    visionDepth: definition.visionDepth,
    guardMoveEveryTicks: definition.guardMoveEveryTicks,
    suspicionPerTick: definition.suspicionPerTick ?? 25,
    suspicionDecayPerTick: definition.suspicionDecayPerTick ?? 12,
    playerNoiseRadius: definition.playerNoiseRadius ?? 3,
    searchDurationTicks: definition.searchDurationTicks ?? 8,
    ventLinks,
  };
}

export const FLOORS: readonly ParsedFloor[] = FLOOR_DEFINITIONS.map(parseFloor);

export function tileAt(floor: ParsedFloor, target: Position): Tile | null {
  return floor.tiles[target.row]?.[target.column] ?? null;
}
