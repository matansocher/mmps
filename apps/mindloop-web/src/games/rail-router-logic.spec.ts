import { describe, expect, it } from 'vitest';
import { E, makeLevel, N, rotateCW, S, solveFlow, W } from './rail-router-logic';
import type { Cell, Puzzle } from './rail-router-logic';

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

describe('rail router generation', () => {
  it('scrambles more tracks at later levels without shrinking the maximum board', () => {
    const later = makeLevel(10, seededRandom(8));
    expect(later.cols).toEqual(6);
    later.cells.forEach((cell, index) => {
      if (!cell.fixed) expect(cell.ports).not.toEqual(later.solution[index]);
    });
    const early = makeLevel(1, () => 0.9);
    expect(early.cells.some((cell, index) => !cell.fixed && cell.ports === early.solution[index])).toEqual(true);
  });
  it('constructs solvable, bent, independently routed puzzles across levels and seeds', () => {
    for (let level = 1; level <= 60; level++) {
      for (let seed = 1; seed <= 20; seed++) {
        const puzzle = makeLevel(level, seededRandom(seed));
        const solvedPuzzle = { ...puzzle, cells: puzzle.cells.map((cell, i) => ({ ...cell, ports: puzzle.solution[i] })) };
        const flow = solveFlow(solvedPuzzle);
        expect([...flow.solved].sort()).toEqual([...puzzle.colors].sort());
        expect(solveFlow(puzzle).solved.size).toEqual(0);
        expect(puzzle.cells).toHaveLength(puzzle.cols * puzzle.rows);
        for (const color of puzzle.colors) {
          expect(puzzle.cells.filter((cell) => cell.kind === 'source' && cell.colorIdx === color)).toHaveLength(1);
          expect(puzzle.cells.filter((cell) => cell.kind === 'station' && cell.colorIdx === color)).toHaveLength(1);
          const route = flow.cells.filter((cell) => cell.lit === color);
          expect(route.length).toBeGreaterThan(puzzle.cols);
          expect(route.some((cell) => cell.kind === 'curve')).toEqual(true);
        }
        puzzle.cells.forEach((cell, i) => {
          const rotations = [cell.ports];
          for (let turn = 0; turn < 3; turn++) rotations.push(rotateCW(rotations.at(-1)!));
          expect(rotations).toContain(puzzle.solution[i]);
          if (cell.fixed) expect(cell.ports).toEqual(puzzle.solution[i]);
        });
      }
    }
  });

  it('is deterministic and remains unsolved for degenerate random sources', () => {
    expect(makeLevel(7, seededRandom(21))).toEqual(makeLevel(7, seededRandom(21)));
    for (const random of [() => 0, () => 0.999999]) {
      for (const level of [1, 2, 4, 6, 1000]) {
        const puzzle = makeLevel(level, random);
        expect(solveFlow(puzzle).solved.size).toEqual(0);
        expect(solveFlow({ ...puzzle, cells: puzzle.cells.map((cell, i) => ({ ...cell, ports: puzzle.solution[i] })) }).solved.size).toEqual(puzzle.colors.length);
      }
    }
  });
});

describe('rail connectivity', () => {
  const source: Cell = { kind: 'source', ports: E, colorIdx: 0, fixed: true, lit: null };
  const track: Cell = { kind: 'straight', ports: E | W, colorIdx: -1, fixed: false, lit: null };
  const station: Cell = { kind: 'station', ports: W, colorIdx: 0, fixed: true, lit: null };
  const puzzle: Puzzle = { cols: 3, rows: 1, cells: [source, track, station], colors: [0] };

  it('rotates all port masks clockwise and returns after four turns', () => {
    expect([N, E, S, W].map(rotateCW)).toEqual([E, S, W, N]);
    for (let ports = 0; ports < 16; ports++) expect(rotateCW(rotateCW(rotateCW(rotateCW(ports))))).toEqual(ports);
  });

  it('requires reciprocal ports and the matching station, without mutating the input', () => {
    expect([...solveFlow(puzzle).solved]).toEqual([0]);
    expect(solveFlow({ ...puzzle, cells: [source, { ...track, ports: N | S }, station] }).solved.size).toEqual(0);
    expect(solveFlow({ ...puzzle, cells: [source, track, { ...station, colorIdx: 1 }] }).solved.size).toEqual(0);
    expect(puzzle.cells.map((cell) => cell.lit)).toEqual([null, null, null]);
  });

  it('does not wrap connections between rows', () => {
    expect(solveFlow({ cols: 2, rows: 2, colors: [0], cells: [track, source, station, track] }).solved.size).toEqual(0);
  });
});
