import { describe, expect, it } from 'vitest';
import {
  advanceEscapeSession,
  applyEscapeMove,
  createEscapePuzzle,
  createEscapeSession,
  createEscapeState,
  ESCAPE_TARGET,
  escapeDragOffset,
  escapeDragRange,
  escapeMoves,
  escapeScore,
  escapeTimeRemaining,
  isEscapeSolved,
  isValidEscapeBoard,
  moveEscapeBlock,
  moveEscapeSession,
  undoEscapeMove,
  undoEscapeSession,
} from './block-escape';
import type { EscapeBoard, EscapeMove, EscapePuzzle } from './block-escape';

function seeded(seed: number): () => number {
  let value = seed;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function solve(puzzle: EscapePuzzle) {
  return puzzle.solution.reduce((state, move) => applyEscapeMove(state, move), createEscapeState(puzzle.board));
}

function challenges(seed: number): readonly EscapePuzzle[] {
  const random = seeded(seed);
  return Array.from({ length: 5 }, (_, index) => createEscapePuzzle(index, undefined, random));
}

// A forward search verifies the reverse-generated distances independently.
function shortestDistance(board: EscapeBoard, singleCell: boolean, allowed?: ReadonlySet<string>): number {
  const queue = [{ board, depth: 0 }];
  const serialize = (value: EscapeBoard) => value.map((block) => `${block.row},${block.column}`).join(';');
  const visited = new Set([serialize(board)]);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (isEscapeSolved(current.board)) return current.depth;
    for (const move of escapeMoves(current.board, singleCell)) {
      if (allowed && !allowed.has(move.id)) continue;
      const next = moveEscapeBlock(current.board, move)!;
      const id = serialize(next);
      if (visited.has(id)) continue;
      visited.add(id);
      queue.push({ board: next, depth: current.depth + 1 });
    }
  }
  return Infinity;
}

describe('Block Escape generation', () => {
  it('starts harder and increases verified planning difficulty through five tiers', () => {
    const puzzles = challenges(24);
    expect(puzzles).toEqual(challenges(24));
    expect(puzzles.slice(0, 4).map((puzzle) => puzzle.planningSlides)).toEqual([3, 4, 5, 6]);
    expect(puzzles[4].planningSlides).toBeGreaterThanOrEqual(7);
    expect(puzzles[4].planningSlides).toBeLessThanOrEqual(9);
    expect(puzzles.slice(2).every((puzzle) => puzzle.board.length === 8)).toEqual(true);
  });

  it('keeps all boards and solution steps valid across fresh and mirrored puzzles', () => {
    const signatures = Array.from({ length: 5 }, () => new Set<string>());
    for (let seed = 0; seed < 80; seed++) {
      const run = challenges(seed * 983);
      run.forEach((puzzle, level) => {
        signatures[level].add(JSON.stringify(puzzle.board));
        expect(isValidEscapeBoard(puzzle.board)).toEqual(true);
        expect(isEscapeSolved(puzzle.board)).toEqual(false);
        expect(puzzle.solution).toHaveLength(puzzle.optimalMoves);
        let board = puzzle.board;
        for (const move of puzzle.solution) {
          const next = moveEscapeBlock(board, move)!;
          expect(next).not.toBeNull();
          expect(isValidEscapeBoard(next)).toEqual(true);
          expect(moveEscapeBlock(next, { ...move, delta: -move.delta })).toEqual(board);
          board = next;
        }
        expect(isEscapeSolved(board)).toEqual(true);
      });
    }
    signatures.forEach((values) => expect(values.size).toBeGreaterThan(2));
  });

  it('proves optimal move counts and multi-step preparations with forward BFS', () => {
    for (const seed of [1, 7, 23, 41]) {
      challenges(seed).forEach((puzzle) => {
        expect(shortestDistance(puzzle.board, true)).toEqual(puzzle.optimalMoves);
        expect(shortestDistance(puzzle.board, false)).toEqual(puzzle.planningSlides);
      });
    }
  });

  it('continues well beyond three boards without immediately repeating a puzzle', () => {
    const random = seeded(67);
    let previous: EscapeBoard | undefined;
    for (let solved = 0; solved < 40; solved++) {
      const puzzle = createEscapePuzzle(solved, previous, random);
      expect(puzzle.board).not.toEqual(previous);
      expect(isEscapeSolved(solve(puzzle).board)).toEqual(true);
      if (solved >= 4) expect(puzzle.planningSlides).toBeGreaterThanOrEqual(7);
      previous = puzzle.board;
    }
  });
});

describe('Block Escape movement validation', () => {
  const board: EscapeBoard = [
    { id: ESCAPE_TARGET, axis: 'horizontal', row: 2, column: 0, length: 2 },
    { id: 'A', axis: 'vertical', row: 1, column: 2, length: 2 },
  ];

  it.each([
    { id: ESCAPE_TARGET, delta: -1 },
    { id: ESCAPE_TARGET, delta: 1 },
    { id: ESCAPE_TARGET, delta: 3 },
    { id: 'A', delta: -2 },
    { id: 'A', delta: 3 },
    { id: 'A', delta: 0 },
    { id: 'A', delta: 0.5 },
    { id: 'A', delta: Infinity },
    { id: 'missing', delta: 1 },
  ])('rejects blocked, jumping, out-of-bounds or malformed move $id / $delta', (move: EscapeMove) => {
    expect(moveEscapeBlock(board, move)).toBeNull();
  });

  it('moves only along the original axis and leaves inputs untouched', () => {
    const snapshot = structuredClone(board);
    const next = moveEscapeBlock(board, { id: 'A', delta: -1 })!;
    expect(next[1]).toEqual({ ...board[1], row: 0 });
    expect(next[0]).toEqual(board[0]);
    expect(board).toEqual(snapshot);
    expect(isValidEscapeBoard(next)).toEqual(true);
  });

  it('rejects overlapping tiles, duplicate ids, missing target and invalid coordinates', () => {
    expect(isValidEscapeBoard([board[0], { ...board[1], column: 1 }])).toEqual(false);
    expect(isValidEscapeBoard([board[0], board[0]])).toEqual(false);
    expect(isValidEscapeBoard([board[1]])).toEqual(false);
    expect(isValidEscapeBoard([{ ...board[0], column: 4 }])).toEqual(false);
    expect(isValidEscapeBoard([{ ...board[0], row: 1 }])).toEqual(false);
    expect(isValidEscapeBoard([{ ...board[0], column: NaN }])).toEqual(false);
    expect(moveEscapeBlock([{ ...board[0], column: -1 }], { id: ESCAPE_TARGET, delta: 1 })).toBeNull();
  });
});

describe('Block Escape undo and scoring', () => {
  it('awards 1,000 points per optimal solution and no points for unfinished boards', () => {
    const run = challenges(5);
    expect(run.reduce((total, puzzle) => total + escapeScore(solve(puzzle), puzzle.optimalMoves), 0)).toEqual(5000);
    expect(escapeScore(createEscapeState(run[0].board), run[0].optimalMoves)).toEqual(0);
  });

  it('restores the board but keeps spent moves, so undo farming reduces rather than increases score', () => {
    const puzzle = challenges(91)[1];
    const initial = createEscapeState(puzzle.board);
    expect(undoEscapeMove(initial)).toBe(initial);
    const moved = applyEscapeMove(initial, puzzle.solution[0]);
    const undone = undoEscapeMove(moved);
    expect(undone.board).toEqual(initial.board);
    expect(undone.moves).toEqual(1);
    expect(undone.undos).toEqual(1);
    expect(undone.history).toHaveLength(0);
    const finished = puzzle.solution.reduce((state, move) => applyEscapeMove(state, move), undone);
    expect(isEscapeSolved(finished.board)).toEqual(true);
    expect(finished.moves).toEqual(puzzle.optimalMoves + 1);
    expect(escapeScore(finished, puzzle.optimalMoves)).toBeLessThan(escapeScore(solve(puzzle), puzzle.optimalMoves));
    expect(undoEscapeMove(finished)).toBe(finished);
    expect(applyEscapeMove(finished, { id: ESCAPE_TARGET, delta: -1 })).toBe(finished);
  });

  it('does not count invalid moves', () => {
    const initial = createEscapeState(challenges(6)[0].board);
    expect(applyEscapeMove(initial, { id: 'missing', delta: 1 })).toBe(initial);
    expect(applyEscapeMove(initial, { id: ESCAPE_TARGET, delta: -1 })).toBe(initial);
  });
});

describe('Block Escape dragging', () => {
  const board: EscapeBoard = [
    { id: ESCAPE_TARGET, axis: 'horizontal', row: 2, column: 0, length: 2 },
    { id: 'A', axis: 'vertical', row: 1, column: 2, length: 2 },
  ];

  it('constrains the visual drag to collisions and board edges in either direction', () => {
    expect(escapeDragRange(board, ESCAPE_TARGET)).toEqual({ min: 0, max: 0 });
    const range = escapeDragRange(board, 'A');
    expect(range).toEqual({ min: -1, max: 2 });
    expect(escapeDragOffset(-400, 60, range)).toEqual(-60);
    expect(escapeDragOffset(400, 60, range)).toEqual(120);
    expect(escapeDragOffset(75, 60, range)).toEqual(75);
    expect(escapeDragOffset(0, 60, range)).toEqual(0);
  });

  it('counts every square in a long drag and undoes the entire drag without refunding moves', () => {
    const initial = createEscapeState(board);
    const dragged = applyEscapeMove(initial, { id: 'A', delta: 2 });
    const stepped = applyEscapeMove(applyEscapeMove(initial, { id: 'A', delta: 1 }), { id: 'A', delta: 1 });
    expect(dragged.board).toEqual(stepped.board);
    expect(dragged.moves).toEqual(2);
    expect(dragged.history).toHaveLength(1);
    const undone = undoEscapeMove(dragged);
    expect(undone.board).toEqual(board);
    expect(undone.moves).toEqual(2);
    expect(undone.undos).toEqual(1);
    expect(undoEscapeMove(undone)).toBe(undone);
  });

  it('does not jump a blocking piece even when dropped on a distant free square', () => {
    expect(applyEscapeMove(createEscapeState(board), { id: ESCAPE_TARGET, delta: 3 }).board).toEqual(board);
    const cleared = moveEscapeBlock(board, { id: 'A', delta: -1 })!;
    expect(escapeDragRange(cleared, ESCAPE_TARGET)).toEqual({ min: 0, max: 3 });
    expect(isEscapeSolved(applyEscapeMove(createEscapeState(cleared), { id: ESCAPE_TARGET, delta: 3 }).board)).toEqual(true);
  });
});

describe('Block Escape timed session', () => {
  it('uses one wall-clock minute including time spent between puzzles or in a background tab', () => {
    const start = 100_000;
    const deadline = start + 60_000;
    expect(escapeTimeRemaining(deadline, start)).toEqual(60);
    expect(escapeTimeRemaining(deadline, start + 15_000)).toEqual(45);
    expect(escapeTimeRemaining(deadline, deadline - 1)).toEqual(0.001);
    expect(escapeTimeRemaining(deadline, deadline)).toEqual(0);
    expect(escapeTimeRemaining(deadline, deadline + 90_000)).toEqual(0);
  });

  it('credits completed boards immediately and exactly once, including before auto-advance', () => {
    const random = seeded(10);
    let session = createEscapeSession(createEscapePuzzle(0, undefined, random));
    expect(advanceEscapeSession(session, createEscapePuzzle(1))).toBe(session);
    for (let board = 0; board < 10; board++) {
      for (const move of session.puzzle.solution) session = moveEscapeSession(session, move);
      expect(session.solved).toEqual(board + 1);
      expect(session.score).toEqual((board + 1) * 1000);
      expect(moveEscapeSession(session, { id: ESCAPE_TARGET, delta: -1 })).toBe(session);
      expect(undoEscapeSession(session)).toBe(session);
      session = advanceEscapeSession(session, createEscapePuzzle(session.solved, session.puzzle.board, random));
      expect(session.state.moves).toEqual(0);
      expect(session.state.history).toHaveLength(0);
      expect(session.score).toEqual((board + 1) * 1000);
    }
    expect(session.solved).toEqual(10);
    expect(session.moves).toBeGreaterThan(50);
  });

  it('preserves total moves and undos and gives no score for an unfinished board', () => {
    const initial = createEscapeSession(createEscapePuzzle(0, undefined, seeded(9)));
    const moved = moveEscapeSession(initial, initial.puzzle.solution[0]);
    const undone = undoEscapeSession(moved);
    expect(undone.moves).toEqual(1);
    expect(undone.undos).toEqual(1);
    expect(undone.score).toEqual(0);
    expect(undone.solved).toEqual(0);
    expect(undone.state.board).toEqual(initial.state.board);
  });
});
