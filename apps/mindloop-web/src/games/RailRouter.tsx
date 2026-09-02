import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { shuffle } from '../lib/utils';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { useCountdown } from '../hooks/useCountdown';

const accent = CATEGORIES.flexibility.accent;
const TOTAL_TIME = 90;

/** Train / station colors. */
const COLORS = [
  { id: 'red', hex: '#ef4444' },
  { id: 'blue', hex: '#3b82f6' },
  { id: 'green', hex: '#22c55e' },
  { id: 'amber', hex: '#f59e0b' },
  { id: 'violet', hex: '#a855f7' },
];

/* Directions as bit flags: N=1, E=2, S=4, W=8. A tile's `ports` is the OR of
 * the sides it connects. Rotating 90° CW maps N→E→S→W→N. */
const N = 1;
const E = 2;
const S = 4;
const W = 8;
const DIRS = [
  { bit: N, dx: 0, dy: -1, opp: S },
  { bit: E, dx: 1, dy: 0, opp: W },
  { bit: S, dx: 0, dy: 1, opp: N },
  { bit: W, dx: -1, dy: 0, opp: E },
];

type Kind = 'straight' | 'curve' | 'tee' | 'source' | 'station';

interface Cell {
  kind: Kind;
  ports: number; // current open sides
  colorIdx: number; // for source/station, else -1
  fixed: boolean; // sources/stations can't rotate
  lit: number | null; // colorIdx currently flowing through, else null
}

interface Puzzle {
  cols: number;
  rows: number;
  cells: Cell[];
  colors: number[]; // color indices used this level
}

/** Rotate a port mask 90° clockwise. */
function rotateCW(ports: number): number {
  let out = 0;
  if (ports & N) out |= E;
  if (ports & E) out |= S;
  if (ports & S) out |= W;
  if (ports & W) out |= N;
  return out;
}

/** Base port mask for a movable tile kind before rotation. */
function basePorts(kind: Kind): number {
  switch (kind) {
    case 'straight':
      return N | S;
    case 'curve':
      return N | E;
    case 'tee':
      return N | E | S;
    default:
      return 0;
  }
}

/**
 * Build a level: place matching source/station pairs on the left/right borders
 * and fill the interior with rotatable track tiles scrambled to random angles.
 */
function makeLevel(level: number): Puzzle {
  const size = Math.min(6, 4 + Math.floor(level / 2)); // 4x4 → 6x6
  const cols = size;
  const rows = size;
  const nColors = Math.min(COLORS.length, Math.min(rows, 2 + Math.floor(level / 2))); // 2 → 5

  const at = (c: number, r: number) => r * cols + c;
  const cells: Cell[] = Array.from({ length: cols * rows }, () => ({
    kind: 'straight' as Kind,
    ports: N | S,
    colorIdx: -1,
    fixed: false,
    lit: null,
  }));

  // Endpoints on the left (sources) and right (stations) columns.
  const leftShuf = shuffle(Array.from({ length: rows }, (_, r) => at(0, r)));
  const rightShuf = shuffle(Array.from({ length: rows }, (_, r) => at(cols - 1, r)));
  const colorPick = shuffle(COLORS.map((_, i) => i)).slice(0, nColors);

  colorPick.forEach((colorIdx, k) => {
    cells[leftShuf[k]] = { kind: 'source', ports: E, colorIdx, fixed: true, lit: null };
    cells[rightShuf[k]] = { kind: 'station', ports: W, colorIdx, fixed: true, lit: null };
  });

  // Fill the rest with scrambled track tiles.
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].kind === 'source' || cells[i].kind === 'station') continue;
    const roll = Math.random();
    const kind: Kind = roll < 0.4 ? 'straight' : roll < 0.85 ? 'curve' : 'tee';
    let ports = basePorts(kind);
    const turns = Math.floor(Math.random() * 4);
    for (let t = 0; t < turns; t++) ports = rotateCW(ports);
    cells[i] = { kind, ports, colorIdx: -1, fixed: false, lit: null };
  }

  return { cols, rows, cells, colors: colorPick };
}

/**
 * Flood connectivity from each source. A→B is valid only if A opens toward B and
 * B opens back. Returns cells with `lit` set on reachable cells, plus the set of
 * solved colors (source reaches its matching station).
 */
function solveFlow(p: Puzzle): { cells: Cell[]; solved: Set<number> } {
  const { cols, rows } = p;
  const cells = p.cells.map((c) => ({ ...c, lit: null as number | null }));
  const solved = new Set<number>();
  const at = (c: number, r: number) => r * cols + c;

  for (let i = 0; i < cells.length; i++) {
    if (cells[i].kind !== 'source') continue;
    const colorIdx = cells[i].colorIdx;
    const seen = new Set<number>([i]);
    const queue: number[] = [i];
    cells[i].lit = colorIdx;
    let reachedStation = false;

    while (queue.length) {
      const cur = queue.shift() as number;
      const cc = cur % cols;
      const cr = Math.floor(cur / cols);
      const curPorts = cells[cur].ports;
      for (const d of DIRS) {
        if (!(curPorts & d.bit)) continue;
        const nc = cc + d.dx;
        const nr = cr + d.dy;
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        const ni = at(nc, nr);
        if (seen.has(ni)) continue;
        const nb = cells[ni];
        if (!(nb.ports & d.opp)) continue;
        if ((nb.kind === 'station' || nb.kind === 'source') && nb.colorIdx !== colorIdx) continue;
        seen.add(ni);
        if (nb.lit == null) nb.lit = colorIdx;
        if (nb.kind === 'station' && nb.colorIdx === colorIdx) reachedStation = true;
        queue.push(ni);
      }
    }
    if (reachedStation) solved.add(colorIdx);
  }

  return { cells, solved };
}

/** SVG track drawing: a segment from center to each open side. */
function TrackGlyph({ ports, color }: { ports: number; color: string }) {
  const sw = 8;
  const mid = 24;
  const paths: string[] = [];
  if (ports & N) paths.push(`M${mid} ${mid} L${mid} 2`);
  if (ports & S) paths.push(`M${mid} ${mid} L${mid} 46`);
  if (ports & W) paths.push(`M${mid} ${mid} L2 ${mid}`);
  if (ports & E) paths.push(`M${mid} ${mid} L46 ${mid}`);
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <circle cx={mid} cy={mid} r={sw / 2} fill={color} />
    </svg>
  );
}

export default function RailRouter({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => makeLevel(1));
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const advancing = useRef(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const finish = useCallback(() => {
    onFinish({
      score: scoreRef.current,
      stats: [{ label: 'Levels solved', value: String(levelRef.current - 1) }],
    });
  }, [onFinish]);

  const timer = useCountdown({ seconds: TOTAL_TIME, autoStart: false, onExpire: finish });

  const start = useCallback(() => {
    setCounting(false);
    timer.reset(TOTAL_TIME);
  }, [timer]);

  const { litCells, solved } = useMemo(() => {
    const res = solveFlow(puzzle);
    return { litCells: res.cells, solved: res.solved };
  }, [puzzle]);

  const allSolved = puzzle.colors.length > 0 && puzzle.colors.every((c) => solved.has(c));

  useEffect(() => {
    if (counting || advancing.current || !allSolved) return;
    advancing.current = true;
    playSound('correct');
    const gained = 100 + puzzle.colors.length * 50 + Math.round(timer.remaining) * 2;
    setScore((s) => {
      const ns = s + gained;
      scoreRef.current = ns;
      return ns;
    });
    timer.addTime(8);
    const t = window.setTimeout(() => {
      setLevel((lv) => {
        const nl = lv + 1;
        levelRef.current = nl;
        setPuzzle(makeLevel(nl));
        advancing.current = false;
        return nl;
      });
    }, 650);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSolved, counting]);

  const rotate = useCallback((i: number) => {
    if (advancing.current) return;
    setPuzzle((p) => {
      const cell = p.cells[i];
      if (cell.fixed) return p;
      const cells = p.cells.slice();
      cells[i] = { ...cell, ports: rotateCW(cell.ports) };
      return { ...p, cells };
    });
    playSound('click');
  }, []);

  const { cols } = puzzle;
  const idleColor = isDark ? '#64748b' : '#94a3b8';

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage
        hud={
          <HUD
            accent={accent}
            score={score}
            time={Math.ceil(timer.remaining)}
            timeFraction={timer.remaining / TOTAL_TIME}
            status={String(level)}
            statusLabel="Level"
          />
        }
      >
        <div className="mb-3 h-6 text-center text-sm font-bold" style={{ color: accent }}>
          Rotate the tracks — connect each train to its matching station.
        </div>

        <div
          className="grid gap-1.5 rounded-3xl bg-white/60 p-2.5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            width: `min(92vw, ${cols * 72}px)`,
          }}
        >
          {puzzle.cells.map((cell, i) => {
            const flow = litCells[i].lit;
            const flowColor = flow != null ? COLORS[flow].hex : null;
            const isEndpoint = cell.kind === 'source' || cell.kind === 'station';

            if (isEndpoint) {
              const endpointColor = COLORS[cell.colorIdx].hex;
              const done = solved.has(cell.colorIdx);
              return (
                <div
                  key={i}
                  className="relative flex aspect-square items-center justify-center rounded-xl"
                  style={{
                    background: `${endpointColor}22`,
                    boxShadow: done ? `0 0 0 2px ${endpointColor}` : undefined,
                  }}
                >
                  <div className="absolute inset-0">
                    <TrackGlyph ports={cell.ports} color={flowColor ?? `${endpointColor}88`} />
                  </div>
                  <div
                    className="relative z-10 flex h-6 w-6 items-center justify-center rounded-md text-[11px] sm:h-7 sm:w-7"
                    style={{ background: endpointColor }}
                  >
                    {cell.kind === 'source' ? '🚂' : '🏁'}
                  </div>
                </div>
              );
            }

            return (
              <motion.button
                key={i}
                onClick={() => rotate(i)}
                whileTap={{ scale: 0.88 }}
                className="ml-tap flex aspect-square items-center justify-center rounded-xl bg-slate-100/70 ring-1 ring-slate-200/60 transition-colors hover:bg-slate-100 dark:bg-white/10 dark:ring-white/10"
              >
                <motion.div
                  className="h-full w-full"
                  key={cell.ports}
                  initial={{ rotate: -90 }}
                  animate={{ rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <TrackGlyph ports={cell.ports} color={flowColor ?? idleColor} />
                </motion.div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm font-bold">
          {puzzle.colors.map((c) => (
            <span
              key={c}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors"
              style={{
                background: solved.has(c) ? `${COLORS[c].hex}22` : 'transparent',
                color: COLORS[c].hex,
              }}
            >
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: COLORS[c].hex }} />
              {solved.has(c) ? '✓' : '•'}
            </span>
          ))}
        </div>
      </GameStage>
    </div>
  );
}
