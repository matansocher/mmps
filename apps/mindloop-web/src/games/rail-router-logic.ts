export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

const DIRS = [
  { bit: N, dx: 0, dy: -1, opp: S },
  { bit: E, dx: 1, dy: 0, opp: W },
  { bit: S, dx: 0, dy: 1, opp: N },
  { bit: W, dx: -1, dy: 0, opp: E },
] as const;

export type Cell = {
  readonly kind: 'straight' | 'curve' | 'tee' | 'source' | 'station';
  readonly ports: number;
  readonly colorIdx: number;
  readonly fixed: boolean;
  readonly lit: number | null;
};

export type Puzzle = {
  readonly cols: number;
  readonly rows: number;
  readonly cells: readonly Cell[];
  readonly colors: readonly number[];
};

export function rotateCW(ports: number): number {
  return ((ports << 1) & 15) | (ports >> 3);
}

function direction(from: number, to: number, size: number): number {
  if (to === from - size) return N;
  if (to === from + size) return S;
  return to > from ? E : W;
}

// Construct disjoint routes first, then scramble only their rotations.
// The returned solution is also a witness that every generated board is solvable.
export function makeLevel(level: number, random: () => number = Math.random): Puzzle & { readonly solution: readonly number[] } {
  const size = Math.min(6, 4 + Math.floor(level / 2));
  const nColors = Math.min(5, 2 + Math.floor(level / 2));
  const pick = (length: number) => Math.floor(random() * length);
  let path = Array.from({ length: size * size }, (_, i) => {
    const row = Math.floor(i / size);
    return row * size + (row % 2 ? size - 1 - (i % size) : i % size);
  });

  // Backbite moves randomize a Hamiltonian path without breaking adjacency
  // or reusing cells. Reverse the prefix up to a neighbor of the first cell.
  for (let step = 0; step < size * size * 6; step++) {
    if (random() < 0.5) path.reverse();
    const head = path[0];
    const neighbors = path.filter((cell, index) => index > 1 && Math.abs((cell % size) - (head % size)) + Math.abs(Math.floor(cell / size) - Math.floor(head / size)) === 1);
    if (!neighbors.length) continue;
    const end = path.indexOf(neighbors[pick(neighbors.length)]);
    path = [...path.slice(0, end).reverse(), ...path.slice(end)];
  }

  const colors = [0, 1, 2, 3, 4];
  for (let i = colors.length - 1; i > 0; i--) {
    const j = pick(i + 1);
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }
  colors.length = nColors;

  const cells: Cell[] = new Array(size * size);
  // More than one grid-width guarantees an interior bend in every route.
  const lengths = Array.from({ length: nColors }, () => size + 1);
  const extra = size * size - nColors * (size + 1);
  for (let i = 0; i < extra; i++) lengths[pick(nColors)]++;

  let offset = 0;
  const routes = lengths.map((length) => {
    const route = path.slice(offset, offset + length);
    offset += length;
    return route;
  });
  routes.forEach((route, routeIndex) => {
    route.forEach((cell, i) => {
      const ports = (i ? direction(cell, route[i - 1], size) : 0) | (i < route.length - 1 ? direction(cell, route[i + 1], size) : 0);
      const kind = i === 0 ? 'source' : i === route.length - 1 ? 'station' : ports === (N | S) || ports === (E | W) ? 'straight' : 'curve';
      const fixed = kind === 'source' || kind === 'station';
      cells[cell] = { kind, ports, colorIdx: fixed ? colors[routeIndex] : -1, fixed, lit: null };
    });
  });
  const solution = cells.map((cell) => cell.ports);
  const scrambleChance = Math.min(1, 0.35 + (level - 1) * 0.075);
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].fixed) continue;
    let ports = cells[i].ports;
    if (random() < scrambleChance) {
      const turns = cells[i].kind === 'straight' ? 1 : 1 + pick(3);
      for (let turn = 0; turn < turns; turn++) ports = rotateCW(ports);
    }
    cells[i] = { ...cells[i], ports };
  }
  // No route starts complete, even with a constant or unlucky random source.
  for (const route of routes) {
    const firstTrack = route[1];
    let ports = cells[firstTrack].ports;
    const towardSource = direction(firstTrack, route[0], size);
    while (ports & towardSource) ports = rotateCW(ports);
    cells[firstTrack] = { ...cells[firstTrack], ports };
  }
  return { cols: size, rows: size, cells, colors, solution };
}

export function solveFlow(puzzle: Puzzle): { readonly cells: readonly Cell[]; readonly solved: ReadonlySet<number> } {
  const { cols, rows } = puzzle;
  const cells = puzzle.cells.map((cell) => ({ ...cell, lit: null as number | null }));
  const solved = new Set<number>();

  for (let i = 0; i < cells.length; i++) {
    if (cells[i].kind !== 'source') continue;
    const colorIdx = cells[i].colorIdx;
    const seen = new Set<number>([i]);
    const queue = [i];
    cells[i].lit = colorIdx;
    for (let position = 0; position < queue.length; position++) {
      const current = queue[position];
      for (const dir of DIRS) {
        if (!(cells[current].ports & dir.bit)) continue;
        const col = (current % cols) + dir.dx;
        const row = Math.floor(current / cols) + dir.dy;
        if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
        const next = row * cols + col;
        const neighbor = cells[next];
        if (seen.has(next) || !(neighbor.ports & dir.opp)) continue;
        if (neighbor.fixed && neighbor.colorIdx !== colorIdx) continue;
        seen.add(next);
        if (neighbor.lit === null) neighbor.lit = colorIdx;
        if (neighbor.kind === 'station') solved.add(colorIdx);
        queue.push(next);
      }
    }
  }
  return { cells, solved };
}
