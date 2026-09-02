import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { randInt } from '../lib/utils';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { useCountdown } from '../hooks/useCountdown';

const accent = CATEGORIES['problem-solving'].accent;
const TOTAL_TIME = 60;

type Phase = 'guess' | 'reveal';

interface Bumper {
  row: number;
  col: number;
  dir: 1 | -1; // 1 = "/" deflects right, -1 = "\" deflects left
}

interface Puzzle {
  cols: number;
  rows: number;
  start: number;
  bumpers: Bumper[];
  path: { col: number; row: number }[];
  exit: number;
}

function buildPuzzle(level: number): Puzzle {
  const cols = Math.min(6, 4 + Math.floor(level / 4));
  const rows = Math.min(6, 3 + Math.floor(level / 3));
  const start = randInt(0, cols - 1);
  const density = 0.32 + Math.min(0.24, level * 0.02);

  const bumpers: Bumper[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() < density) {
        bumpers.push({ row: r, col: c, dir: Math.random() < 0.5 ? 1 : -1 });
      }
    }
  }
  const bumperAt = (r: number, c: number) => bumpers.find((b) => b.row === r && b.col === c);

  const path: { col: number; row: number }[] = [];
  let col = start;
  for (let r = 0; r < rows; r++) {
    path.push({ col, row: r });
    const b = bumperAt(r, col);
    if (b) col = Math.max(0, Math.min(cols - 1, col + b.dir));
  }
  path.push({ col, row: rows });
  return { cols, rows, start, bumpers, path, exit: col };
}

export default function PinballRecall({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => buildPuzzle(0));
  const [phase, setPhase] = useState<Phase>('guess');
  const [guess, setGuess] = useState<number | null>(null);
  const [ballStep, setBallStep] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [lastOk, setLastOk] = useState<boolean | null>(null);

  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const roundsRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { correctRef.current = correct; }, [correct]);
  useEffect(() => { roundsRef.current = rounds; }, [rounds]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    clearTimers();
    onFinish({
      score: scoreRef.current,
      stats: [
        { label: 'Correct', value: String(correctRef.current) },
        { label: 'Rounds', value: String(roundsRef.current) },
      ],
    });
  }, [onFinish]);

  const timer = useCountdown({ seconds: TOTAL_TIME, autoStart: false, onExpire: finish });

  const start = useCallback(() => {
    setCounting(false);
    timer.reset(TOTAL_TIME);
  }, [timer]);

  const nextPuzzle = useCallback(() => {
    if (finished.current) return;
    setPuzzle(buildPuzzle(roundsRef.current));
    setGuess(null);
    setBallStep(0);
    setLastOk(null);
    setPhase('guess');
  }, []);

  const animateBall = useCallback((p: Puzzle) => {
    p.path.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setBallStep(i), i * 240));
    });
  }, []);

  const choose = useCallback(
    (col: number) => {
      if (phase !== 'guess' || counting || finished.current) return;
      setGuess(col);
      setPhase('reveal');
      animateBall(puzzle);
      const ok = col === puzzle.exit;
      const revealMs = puzzle.path.length * 240 + 250;
      timers.current.push(
        window.setTimeout(() => {
          if (finished.current) return;
          setLastOk(ok);
          setRounds((r) => r + 1);
          if (ok) {
            setCorrect((c) => c + 1);
            setScore((s) => s + 40 + puzzle.rows * 5);
            playSound('correct');
          } else {
            setScore((s) => Math.max(0, s - 10));
            timer.addTime(-1);
            playSound('wrong');
          }
          timers.current.push(window.setTimeout(nextPuzzle, 1000));
        }, revealMs),
      );
    },
    [phase, counting, puzzle, animateBall, timer, nextPuzzle],
  );

  // ---- SVG geometry ----
  const { cols, rows } = puzzle;
  const CELL = cols > 5 ? 48 : 56;
  const GAP = 8;
  const step = CELL + GAP;
  const boardW = cols * step - GAP;
  const topPad = 40; // room for the drop arrow
  const botPad = 46; // room for exit slots
  const gridH = (rows + 1) * step - GAP; // +1 row for the exit landing row
  const boardH = topPad + gridH + botPad;

  const cx = (c: number) => c * step + CELL / 2;
  const cy = (r: number) => topPad + r * step + CELL / 2;

  const ball = puzzle.path[Math.min(ballStep, puzzle.path.length - 1)];
  const shownPath = puzzle.path.slice(0, Math.min(ballStep + 1, puzzle.path.length));
  const trail = shownPath.map((p) => `${cx(p.col)},${cy(p.row)}`).join(' ');

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage
        hud={
          <HUD
            accent={accent}
            score={score}
            time={timer.remaining}
            timeFraction={timer.remaining / TOTAL_TIME}
            status={`${correct}✓`}
          />
        }
      >
        <p className="mb-3 text-center text-sm font-bold text-slate-400 dark:text-slate-500">
          Trace the ball through the bumpers — which slot does it drop into?
        </p>

        <div className="rounded-3xl bg-white/70 p-3 shadow-sm ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10">
          <svg viewBox={`0 0 ${boardW} ${boardH}`} width={boardW} height={boardH} className="max-w-full" role="img" aria-label="Pinball board">
            {/* Drop indicator above the start column */}
            <g>
              <line x1={cx(puzzle.start)} y1={8} x2={cx(puzzle.start)} y2={topPad - 6} stroke={accent} strokeWidth="3" strokeLinecap="round" />
              <path d={`M${cx(puzzle.start) - 6} ${topPad - 12} L${cx(puzzle.start)} ${topPad - 4} L${cx(puzzle.start) + 6} ${topPad - 12} Z`} fill={accent} />
            </g>

            {/* Grid cells + bumpers */}
            {Array.from({ length: rows }).map((_, r) =>
              Array.from({ length: cols }).map((_, c) => {
                const b = puzzle.bumpers.find((x) => x.row === r && x.col === c);
                return (
                  <g key={`${r}-${c}`}>
                    <rect
                      x={c * step}
                      y={topPad + r * step}
                      width={CELL}
                      height={CELL}
                      rx="12"
                      className="fill-slate-100 dark:fill-white/5"
                    />
                    {b && (
                      <line
                        x1={c * step + (b.dir === 1 ? 12 : CELL - 12)}
                        y1={topPad + r * step + CELL - 12}
                        x2={c * step + (b.dir === 1 ? CELL - 12 : 12)}
                        y2={topPad + r * step + 12}
                        stroke="#64748b"
                        strokeWidth="7"
                        strokeLinecap="round"
                      />
                    )}
                  </g>
                );
              }),
            )}

            {/* Ball trail (revealed progressively) */}
            {phase === 'reveal' && shownPath.length > 1 && (
              <polyline points={trail} fill="none" stroke={accent} strokeOpacity="0.4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* The ball */}
            {phase === 'reveal' && (
              <motion.circle
                r="11"
                fill={accent}
                stroke="#fff"
                strokeWidth="3"
                animate={{ cx: cx(ball.col), cy: cy(ball.row) }}
                transition={{ duration: 0.2, ease: 'linear' }}
              />
            )}

            {/* Exit slots along the bottom landing row */}
            {Array.from({ length: cols }).map((_, c) => {
              const isGuess = guess === c;
              const isExit = phase === 'reveal' && lastOk !== null && c === puzzle.exit;
              let fill = 'rgba(148,163,184,0.25)';
              let stroke = '#cbd5e1';
              if (isExit) { fill = lastOk ? accent : '#22c55e'; stroke = '#fff'; }
              else if (isGuess && lastOk === false) { fill = '#ef4444'; stroke = '#fff'; }
              else if (isGuess) { fill = accent; stroke = '#fff'; }
              const y = topPad + rows * step;
              return (
                <g
                  key={`slot-${c}`}
                  onClick={() => choose(c)}
                  style={{ cursor: phase === 'guess' ? 'pointer' : 'default' }}
                >
                  <rect x={c * step} y={y} width={CELL} height={CELL} rx="14" fill={fill} stroke={stroke} strokeWidth="2.5" />
                  <text x={cx(c)} y={cy(rows) + 6} textAnchor="middle" fontSize="20" fontWeight="800" fill={isGuess || isExit ? '#fff' : '#94a3b8'}>
                    {c + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <p className="mt-3 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
          {phase === 'guess' ? 'Tap the slot where you think it lands' : lastOk === null ? 'Rolling…' : lastOk ? 'Nice!' : `It landed in slot ${puzzle.exit + 1}`}
        </p>
      </GameStage>
    </div>
  );
}
