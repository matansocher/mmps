export const ESCAPE_SIZE = 5;
export const ESCAPE_TARGET = 'friend';
export const ESCAPE_SECONDS = 60;

export type EscapeBlock = {
  readonly id: string;
  readonly axis: 'horizontal' | 'vertical';
  readonly row: number;
  readonly column: number;
  readonly length: 2;
};
export type EscapeBoard = readonly EscapeBlock[];
export type EscapeMove = { readonly id: string; readonly delta: number };
export type EscapePuzzle = {
  readonly board: EscapeBoard;
  readonly optimalMoves: number;
  readonly planningSlides: number;
  readonly solution: readonly EscapeMove[];
};
export type EscapeState = {
  readonly board: EscapeBoard;
  readonly history: readonly EscapeBoard[];
  readonly moves: number;
  readonly undos: number;
};

const SOLVED_SEEDS: readonly EscapeBoard[] = [
  [
    { id: ESCAPE_TARGET, axis: 'horizontal', row: 2, column: 3, length: 2 },
    { id: 'A', axis: 'vertical', row: 2, column: 2, length: 2 },
    { id: 'B', axis: 'horizontal', row: 1, column: 2, length: 2 },
    { id: 'C', axis: 'horizontal', row: 0, column: 3, length: 2 },
    { id: 'D', axis: 'vertical', row: 3, column: 3, length: 2 },
    { id: 'E', axis: 'horizontal', row: 4, column: 0, length: 2 },
  ],
  [
    { id: ESCAPE_TARGET, axis: 'horizontal', row: 2, column: 3, length: 2 },
    { id: 'A', axis: 'horizontal', row: 4, column: 2, length: 2 },
    { id: 'B', axis: 'vertical', row: 0, column: 2, length: 2 },
    { id: 'C', axis: 'horizontal', row: 4, column: 0, length: 2 },
    { id: 'D', axis: 'vertical', row: 3, column: 4, length: 2 },
    { id: 'E', axis: 'vertical', row: 2, column: 0, length: 2 },
    { id: 'F', axis: 'vertical', row: 1, column: 1, length: 2 },
    { id: 'G', axis: 'horizontal', row: 1, column: 3, length: 2 },
  ],
  [
    { id: ESCAPE_TARGET, axis: 'horizontal', row: 2, column: 3, length: 2 },
    { id: 'A', axis: 'horizontal', row: 4, column: 1, length: 2 },
    { id: 'B', axis: 'vertical', row: 3, column: 4, length: 2 },
    { id: 'C', axis: 'vertical', row: 3, column: 0, length: 2 },
    { id: 'D', axis: 'horizontal', row: 1, column: 1, length: 2 },
    { id: 'E', axis: 'vertical', row: 2, column: 2, length: 2 },
    { id: 'F', axis: 'horizontal', row: 1, column: 3, length: 2 },
    { id: 'G', axis: 'vertical', row: 2, column: 1, length: 2 },
  ],
];

function cells(block: EscapeBlock): readonly number[] {
  return Array.from({ length: block.length }, (_, offset) => {
    const row = block.row + (block.axis === 'vertical' ? offset : 0);
    const column = block.column + (block.axis === 'horizontal' ? offset : 0);
    return row * ESCAPE_SIZE + column;
  });
}

export function isValidEscapeBoard(board: EscapeBoard): boolean {
  const occupied = new Set<number>();
  const ids = new Set<string>();
  for (const block of board) {
    if (
      ids.has(block.id) ||
      !block.id ||
      !Number.isInteger(block.row) ||
      !Number.isInteger(block.column) ||
      block.length !== 2 ||
      !['horizontal', 'vertical'].includes(block.axis) ||
      block.row < 0 ||
      block.column < 0 ||
      block.row + (block.axis === 'vertical' ? block.length : 1) > ESCAPE_SIZE ||
      block.column + (block.axis === 'horizontal' ? block.length : 1) > ESCAPE_SIZE
    )
      return false;
    ids.add(block.id);
    for (const cell of cells(block)) {
      if (occupied.has(cell)) return false;
      occupied.add(cell);
    }
  }
  const target = board.find((block) => block.id === ESCAPE_TARGET);
  return target?.axis === 'horizontal' && target.row === 2;
}

export function isEscapeSolved(board: EscapeBoard): boolean {
  return isValidEscapeBoard(board) && board.some((block) => block.id === ESCAPE_TARGET && block.column === ESCAPE_SIZE - block.length);
}

export function moveEscapeBlock(board: EscapeBoard, { id, delta }: EscapeMove): EscapeBoard | null {
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) >= ESCAPE_SIZE || !isValidEscapeBoard(board)) return null;
  const block = board.find((piece) => piece.id === id);
  if (!block) return null;
  // Check every crossed cell, not just the destination: long slides cannot jump blocks.
  let next = board;
  for (let step = 1; step <= Math.abs(delta); step++) {
    next = board.map((piece) =>
      piece.id !== id
        ? piece
        : {
            ...piece,
            row: piece.row + (piece.axis === 'vertical' ? Math.sign(delta) * step : 0),
            column: piece.column + (piece.axis === 'horizontal' ? Math.sign(delta) * step : 0),
          },
    );
    if (!isValidEscapeBoard(next)) return null;
  }
  return next;
}

export function escapeMoves(board: EscapeBoard, singleCell = true): readonly EscapeMove[] {
  const moves: EscapeMove[] = [];
  for (const block of board) {
    for (const direction of [-1, 1]) {
      for (let distance = 1; distance <= (singleCell ? 1 : ESCAPE_SIZE - 1); distance++) {
        const move = { id: block.id, delta: direction * distance };
        if (!moveEscapeBlock(board, move)) break;
        moves.push(move);
      }
    }
  }
  return moves;
}

function key(board: EscapeBoard): string {
  return board.map((block) => `${block.axis},${block.row},${block.column}`).join(';');
}

type Node = {
  readonly board: EscapeBoard;
  readonly edges: readonly { readonly move: EscapeMove; readonly destination: string }[];
};
type Route = { readonly distance: number; readonly solution: readonly EscapeMove[] };
let catalogue: readonly (readonly EscapePuzzle[])[] | undefined;

function puzzlesFromSeed(seed: EscapeBoard): readonly EscapePuzzle[] {
  // Enumerate only legal scrambles from a solved board. Every edge is reversible.
  const graph = new Map<string, Node>();
  const queue = [seed];
  const seen = new Set([key(seed)]);
  for (let index = 0; index < queue.length; index++) {
    const board = queue[index];
    const edges = escapeMoves(board, false).map((move) => {
      const next = moveEscapeBlock(board, move)!;
      const destination = key(next);
      if (!seen.has(destination)) {
        seen.add(destination);
        queue.push(next);
      }
      return { move, destination };
    });
    graph.set(key(board), { board, edges });
  }

  function routes(singleCell: boolean): Map<string, Route> {
    const result = new Map<string, Route>();
    const pending: string[] = [];
    for (const [id, node] of graph) {
      if (!isEscapeSolved(node.board)) continue;
      pending.push(id);
      result.set(id, { distance: 0, solution: [] });
    }
    // Multi-source BFS finds distance to ANY escape, not merely back to the seed.
    for (let index = 0; index < pending.length; index++) {
      const id = pending[index];
      const route = result.get(id)!;
      for (const { move, destination } of graph.get(id)!.edges) {
        if ((singleCell && Math.abs(move.delta) !== 1) || result.has(destination)) continue;
        result.set(destination, {
          distance: route.distance + 1,
          solution: [{ id: move.id, delta: -move.delta }, ...route.solution],
        });
        pending.push(destination);
      }
    }
    return result;
  }

  const slides = routes(false);
  const steps = routes(true);
  const puzzles: EscapePuzzle[] = [];
  for (const [id, { board }] of graph) {
    const slideRoute = slides.get(id)!;
    const stepRoute = steps.get(id)!;
    if (board[0].column !== 0 || slideRoute.distance < 3) continue;
    const puzzle = { board, optimalMoves: stepRoute.distance, planningSlides: slideRoute.distance, solution: stepRoute.solution };
    puzzles.push(puzzle, {
      ...puzzle,
      board: board.map((block) => ({ ...block, row: ESCAPE_SIZE - block.row - (block.axis === 'vertical' ? block.length : 1) })),
      solution: puzzle.solution.map((move) => ({ ...move, delta: board.find((block) => block.id === move.id)!.axis === 'vertical' ? -move.delta : move.delta })),
    });
  }
  return puzzles;
}

export function createEscapePuzzle(solved: number, previous?: EscapeBoard, random: () => number = Math.random): EscapePuzzle {
  if (!catalogue) {
    const puzzles = SOLVED_SEEDS.flatMap(puzzlesFromSeed);
    catalogue = [3, 4, 5, 6, 7].map((minimum) => {
      const tier = puzzles.filter((puzzle) => (minimum === 7 ? puzzle.planningSlides >= minimum : puzzle.planningSlides === minimum));
      if (!tier.length) throw new Error(`No verified escape puzzles with ${minimum} planning slides`);
      return tier;
    });
  }
  const tier = catalogue[Math.min(4, Math.max(0, Math.floor(solved)))];
  const choices = previous ? tier.filter((puzzle) => key(puzzle.board) !== key(previous)) : tier;
  return choices[Math.floor(random() * choices.length)];
}

export function createEscapeState(board: EscapeBoard): EscapeState {
  return { board, history: [], moves: 0, undos: 0 };
}

export function applyEscapeMove(state: EscapeState, move: EscapeMove): EscapeState {
  if (isEscapeSolved(state.board)) return state;
  const board = moveEscapeBlock(state.board, move);
  if (!board) return state;
  return { ...state, board, history: [...state.history, state.board], moves: state.moves + Math.abs(move.delta) };
}

export function undoEscapeMove(state: EscapeState): EscapeState {
  if (!state.history.length || isEscapeSolved(state.board)) return state;
  return {
    ...state,
    board: state.history[state.history.length - 1],
    history: state.history.slice(0, -1),
    // Undo restores space, never spent moves. Repeating a move cannot earn points.
    undos: state.undos + 1,
  };
}

export function escapeScore(state: EscapeState, optimalMoves: number): number {
  if (!isEscapeSolved(state.board) || state.moves === 0) return 0;
  return Math.min(1000, Math.round((1000 * optimalMoves) / state.moves));
}

export function escapeDragRange(board: EscapeBoard, id: string): { readonly min: number; readonly max: number } {
  const moves = escapeMoves(board, false)
    .filter((move) => move.id === id)
    .map((move) => move.delta);
  return { min: Math.min(0, ...moves), max: Math.max(0, ...moves) };
}

export function escapeDragOffset(pixels: number, cellSize: number, range: { readonly min: number; readonly max: number }): number {
  return Math.min(range.max * cellSize, Math.max(range.min * cellSize, pixels));
}

export type EscapeSession = {
  readonly puzzle: EscapePuzzle;
  readonly state: EscapeState;
  readonly solved: number;
  readonly score: number;
  readonly moves: number;
  readonly undos: number;
};

export function createEscapeSession(puzzle: EscapePuzzle): EscapeSession {
  return { puzzle, state: createEscapeState(puzzle.board), solved: 0, score: 0, moves: 0, undos: 0 };
}

export function moveEscapeSession(session: EscapeSession, move: EscapeMove): EscapeSession {
  const next = applyEscapeMove(session.state, move);
  if (next === session.state) return session;
  const solved = isEscapeSolved(next.board);
  return {
    ...session,
    state: next,
    moves: session.moves + next.moves - session.state.moves,
    solved: session.solved + Number(solved),
    score: session.score + (solved ? escapeScore(next, session.puzzle.optimalMoves) : 0),
  };
}

export function undoEscapeSession(session: EscapeSession): EscapeSession {
  const next = undoEscapeMove(session.state);
  return next === session.state ? session : { ...session, state: next, undos: session.undos + 1 };
}

export function advanceEscapeSession(session: EscapeSession, puzzle: EscapePuzzle): EscapeSession {
  return isEscapeSolved(session.state.board) ? { ...session, puzzle, state: createEscapeState(puzzle.board) } : session;
}

export function escapeTimeRemaining(deadline: number, now: number): number {
  return Math.max(0, Math.min(ESCAPE_SECONDS, (deadline - now) / 1000));
}
