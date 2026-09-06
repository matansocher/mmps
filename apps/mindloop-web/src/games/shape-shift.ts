import { pick, randInt, shuffle } from '../lib/utils';

export type ShapeCell = readonly [number, number];
export type Shape = readonly ShapeCell[];
export type ShapeRound = {
  readonly target: Shape;
  readonly options: readonly Shape[];
  readonly correctIndex: number;
  readonly level: number;
};
export type ShapeScore = {
  readonly score: number;
  readonly correct: number;
  readonly attempts: number;
  readonly streak: number;
  readonly bestStreak: number;
};

export const INITIAL_SHAPE_SCORE: ShapeScore = { score: 0, correct: 0, attempts: 0, streak: 0, bestStreak: 0 };

const SHAPES: readonly (readonly Shape[])[] = [
  [
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
    ],
    [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
  ],
  [
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 3],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
    [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 1],
    ],
    [
      [0, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2],
    ],
  ],
  [
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 3],
      [2, 3],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
      [0, 3],
    ],
    [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 3],
    ],
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 1],
      [2, 1],
    ],
    [
      [0, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
  ],
];

export function normalizeShape(shape: Shape): Shape {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]): ShapeCell => [x - minX, y - minY]).sort(([ax, ay], [bx, by]) => ay - by || ax - bx);
}

export function rotateShape(shape: Shape, turns: number): Shape {
  let rotated = shape;
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) {
    rotated = rotated.map(([x, y]): ShapeCell => [-y, x]);
  }
  return normalizeShape(rotated);
}

export function mirrorShape(shape: Shape): Shape {
  return normalizeShape(shape.map(([x, y]): ShapeCell => [-x, y]));
}

// Translation and rotation do not change identity; reflection deliberately does.
export function shapeIdentity(shape: Shape): string {
  return [0, 1, 2, 3].map((turns) => JSON.stringify(rotateShape(shape, turns))).sort()[0];
}

export function createShapeRound(correct: number): ShapeRound {
  const level = Math.min(3, 1 + Math.floor(correct / 4));
  const pool = SHAPES[level - 1];
  const asymmetric = pool.filter((shape) => shapeIdentity(shape) !== shapeIdentity(mirrorShape(shape)));
  const target = rotateShape(pick(asymmetric), randInt(0, 3));
  const targetId = shapeIdentity(target);
  const mirrored = mirrorShape(target);
  const mirrorId = shapeIdentity(mirrored);
  const distinct = new Map<string, Shape>();
  for (const shape of shuffle([...pool])) {
    const id = shapeIdentity(shape);
    if (id !== targetId && id !== mirrorId) distinct.set(id, shape);
  }
  const decoys = [...distinct.values()].slice(0, 2);
  if (level > 1) decoys.push(mirrored);
  const options = shuffle([rotateShape(target, randInt(1, 3)), ...decoys.map((shape) => rotateShape(shape, randInt(0, 3)))]);
  return { target, options, level, correctIndex: options.findIndex((shape) => shapeIdentity(shape) === targetId) };
}

export function scoreShapeAnswer(current: ShapeScore, right: boolean, level: number): ShapeScore {
  const streak = right ? current.streak + 1 : 0;
  return {
    score: Math.max(0, current.score + (right ? 30 + level * 10 + Math.min(streak, 5) * 5 : -20)),
    correct: current.correct + Number(right),
    attempts: current.attempts + 1,
    streak,
    bestStreak: Math.max(current.bestStreak, streak),
  };
}
