import type { Level, Point, RailEdge, RailNode } from './model';

function node(id: string, x: number, y: number, kind: RailNode['kind'], outputs: readonly string[] = [], color?: number): RailNode {
  return { id, x, y, kind, outputs, ...(color === undefined ? {} : { color }) };
}

function edge(from: string, to: string, ...coordinates: readonly (readonly [number, number])[]): RailEdge {
  return { id: `${from}-${to}`, from, to, points: coordinates.map(([x, y]): Point => ({ x, y })) };
}

const board = { width: 600, height: 440, depot: 'depot' } as const;

function withSwitchEntries(level: Level): Level {
  return {
    ...level,
    edges: level.edges.map((edge) => {
      if (level.nodes.find((node) => node.id === edge.from)?.kind !== 'switch') return edge;
      const incoming = level.edges.find((candidate) => candidate.to === edge.from);
      if (!incoming) throw new Error(`Missing incoming edge at ${edge.from}`);
      const end = incoming.points[incoming.points.length - 1];
      const before = incoming.points[incoming.points.length - 2];
      return { ...edge, entryDirection: { x: Math.sign(end.x - before.x), y: Math.sign(end.y - before.y) } };
    }),
  };
}

const boards: readonly Level[] = [
  {
    ...board,
    id: 'corridor-1',
    name: 'Junction',
    family: 'Corridor',
    difficulty: 'Easy',
    speed: 45,
    spawnEvery: 3.3,
    nodes: [
      node('depot', 540, 392, 'depot', ['depot-a']),
      node('a', 460, 340, 'switch', ['a-s0', 'a-b']),
      node('b', 300, 240, 'switch', ['b-s1', 'b-c']),
      node('c', 300, 120, 'switch', ['c-s2', 'c-s3']),
      node('s0', 60, 340, 'station', [], 0),
      node('s1', 60, 240, 'station', [], 1),
      node('s2', 60, 80, 'station', [], 2),
      node('s3', 540, 80, 'station', [], 3),
    ],
    edges: [
      edge('depot', 'a', [540, 392], [460, 392], [460, 340]),
      edge('a', 's0', [460, 340], [60, 340]),
      edge('a', 'b', [460, 340], [460, 240], [300, 240]),
      edge('b', 's1', [300, 240], [60, 240]),
      edge('b', 'c', [300, 240], [300, 120]),
      edge('c', 's2', [300, 120], [180, 120], [180, 80], [60, 80]),
      edge('c', 's3', [300, 120], [420, 120], [420, 80], [540, 80]),
    ],
  },
  {
    ...board,
    id: 'corridor-2',
    name: 'Sidings',
    family: 'Corridor',
    difficulty: 'Medium',
    speed: 48,
    spawnEvery: 3,
    nodes: [
      node('depot', 540, 392, 'depot', ['depot-a']),
      node('a', 460, 340, 'switch', ['a-s0', 'a-b']),
      node('b', 300, 270, 'switch', ['b-s1', 'b-c']),
      node('c', 300, 174, 'switch', ['c-s2', 'c-d']),
      node('d', 300, 78, 'switch', ['d-s3', 'd-s4']),
      node('s0', 60, 340, 'station', [], 0),
      node('s1', 60, 270, 'station', [], 1),
      node('s2', 540, 174, 'station', [], 2),
      node('s3', 60, 64, 'station', [], 3),
      node('s4', 540, 64, 'station', [], 4),
    ],
    edges: [
      edge('depot', 'a', [540, 392], [460, 392], [460, 340]),
      edge('a', 's0', [460, 340], [60, 340]),
      edge('a', 'b', [460, 340], [460, 270], [300, 270]),
      edge('b', 's1', [300, 270], [60, 270]),
      edge('b', 'c', [300, 270], [300, 174]),
      edge('c', 's2', [300, 174], [540, 174]),
      edge('c', 'd', [300, 174], [300, 78]),
      edge('d', 's3', [300, 78], [180, 78], [180, 64], [60, 64]),
      edge('d', 's4', [300, 78], [420, 78], [420, 64], [540, 64]),
    ],
  },
  {
    ...board,
    id: 'corridor-3',
    name: 'Main Line',
    family: 'Corridor',
    difficulty: 'Hard',
    speed: 50,
    spawnEvery: 2.7,
    nodes: [
      node('depot', 540, 392, 'depot', ['depot-a']),
      node('a', 460, 340, 'switch', ['a-s0', 'a-b']),
      node('b', 300, 270, 'switch', ['b-e', 'b-c']),
      node('c', 300, 174, 'switch', ['c-s3', 'c-d']),
      node('d', 300, 78, 'switch', ['d-s4', 'd-s5']),
      node('e', 160, 270, 'switch', ['e-s1', 'e-s2']),
      node('s0', 60, 340, 'station', [], 0),
      node('s1', 60, 270, 'station', [], 1),
      node('s2', 60, 174, 'station', [], 2),
      node('s3', 540, 174, 'station', [], 3),
      node('s4', 60, 64, 'station', [], 4),
      node('s5', 540, 64, 'station', [], 5),
    ],
    edges: [
      edge('depot', 'a', [540, 392], [460, 392], [460, 340]),
      edge('a', 's0', [460, 340], [60, 340]),
      edge('a', 'b', [460, 340], [460, 270], [300, 270]),
      edge('b', 'e', [300, 270], [160, 270]),
      edge('b', 'c', [300, 270], [300, 174]),
      edge('c', 's3', [300, 174], [540, 174]),
      edge('c', 'd', [300, 174], [300, 78]),
      edge('d', 's4', [300, 78], [180, 78], [180, 64], [60, 64]),
      edge('d', 's5', [300, 78], [420, 78], [420, 64], [540, 64]),
      edge('e', 's1', [160, 270], [60, 270]),
      edge('e', 's2', [160, 270], [160, 174], [60, 174]),
    ],
  },
  {
    ...board,
    id: 'scattered-1',
    name: 'Fork',
    family: 'Scattered',
    difficulty: 'Easy',
    speed: 45,
    spawnEvery: 3.3,
    nodes: [
      node('depot', 540, 392, 'depot', ['depot-a']),
      node('a', 460, 340, 'switch', ['a-b', 'a-c']),
      node('b', 160, 220, 'switch', ['b-s0', 'b-s1']),
      node('c', 460, 220, 'switch', ['c-s2', 'c-s3']),
      node('s0', 60, 80, 'station', [], 0),
      node('s1', 60, 220, 'station', [], 1),
      node('s2', 540, 220, 'station', [], 2),
      node('s3', 540, 80, 'station', [], 3),
    ],
    edges: [
      edge('depot', 'a', [540, 392], [460, 392], [460, 340]),
      edge('a', 'b', [460, 340], [160, 340], [160, 220]),
      edge('a', 'c', [460, 340], [460, 220]),
      edge('b', 's0', [160, 220], [160, 80], [60, 80]),
      edge('b', 's1', [160, 220], [60, 220]),
      edge('c', 's2', [460, 220], [540, 220]),
      edge('c', 's3', [460, 220], [460, 80], [540, 80]),
    ],
  },
  {
    ...board,
    id: 'scattered-2',
    name: 'Switchyard',
    family: 'Scattered',
    difficulty: 'Medium',
    speed: 48,
    spawnEvery: 3,
    nodes: [
      node('depot', 540, 392, 'depot', ['depot-a']),
      node('a', 460, 340, 'switch', ['a-b', 'a-c']),
      node('b', 160, 240, 'switch', ['b-d', 'b-s2']),
      node('c', 460, 240, 'switch', ['c-s3', 'c-s4']),
      node('d', 160, 120, 'switch', ['d-s0', 'd-s1']),
      node('s0', 60, 80, 'station', [], 0),
      node('s1', 260, 80, 'station', [], 1),
      node('s2', 60, 260, 'station', [], 2),
      node('s3', 540, 240, 'station', [], 3),
      node('s4', 460, 64, 'station', [], 4),
    ],
    edges: [
      edge('depot', 'a', [540, 392], [460, 392], [460, 340]),
      edge('a', 'b', [460, 340], [160, 340], [160, 240]),
      edge('a', 'c', [460, 340], [460, 240]),
      edge('b', 'd', [160, 240], [160, 120]),
      edge('b', 's2', [160, 240], [60, 240], [60, 260]),
      edge('c', 's3', [460, 240], [540, 240]),
      edge('c', 's4', [460, 240], [460, 64]),
      edge('d', 's0', [160, 120], [160, 80], [60, 80]),
      edge('d', 's1', [160, 120], [260, 120], [260, 80]),
    ],
  },
  {
    ...board,
    id: 'scattered-3',
    name: 'Grand Central',
    family: 'Scattered',
    difficulty: 'Hard',
    speed: 50,
    spawnEvery: 2.7,
    nodes: [
      node('depot', 540, 392, 'depot', ['depot-a']),
      node('a', 460, 340, 'switch', ['a-b', 'a-c']),
      node('b', 160, 240, 'switch', ['b-d', 'b-s2']),
      node('c', 460, 240, 'switch', ['c-e', 'c-s5']),
      node('d', 160, 120, 'switch', ['d-s0', 'd-s1']),
      node('e', 460, 120, 'switch', ['e-s3', 'e-s4']),
      node('s0', 60, 64, 'station', [], 0),
      node('s1', 260, 64, 'station', [], 1),
      node('s2', 60, 260, 'station', [], 2),
      node('s3', 340, 64, 'station', [], 3),
      node('s4', 540, 64, 'station', [], 4),
      node('s5', 540, 260, 'station', [], 5),
    ],
    edges: [
      edge('depot', 'a', [540, 392], [460, 392], [460, 340]),
      edge('a', 'b', [460, 340], [160, 340], [160, 240]),
      edge('a', 'c', [460, 340], [460, 240]),
      edge('b', 'd', [160, 240], [160, 120]),
      edge('b', 's2', [160, 240], [60, 240], [60, 260]),
      edge('c', 'e', [460, 240], [460, 120]),
      edge('c', 's5', [460, 240], [540, 240], [540, 260]),
      edge('d', 's0', [160, 120], [160, 64], [60, 64]),
      edge('d', 's1', [160, 120], [260, 120], [260, 64]),
      edge('e', 's3', [460, 120], [340, 120], [340, 64]),
      edge('e', 's4', [460, 120], [460, 64], [540, 64]),
    ],
  },
];

export const LEVELS: readonly Level[] = boards.map(withSwitchEntries);
