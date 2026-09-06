import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { useCountdown } from '../hooks/useCountdown';
import { useTheme } from '../hooks/useTheme';
import { CATEGORIES } from '../lib/categories';
import { playSound } from '../lib/sound';
import type { GameProps } from '../lib/types';
import { E, makeLevel, N, rotateCW, S, solveFlow, W } from './rail-router-logic';
import type { Puzzle } from './rail-router-logic';

const accent = CATEGORIES.flexibility.accent;
const TOTAL_TIME = 90;
const COLORS = [
  { name: 'red', light: '#b91c1c', dark: '#f87171' },
  { name: 'blue', light: '#1d4ed8', dark: '#60a5fa' },
  { name: 'green', light: '#15803d', dark: '#4ade80' },
  { name: 'amber', light: '#a16207', dark: '#fbbf24' },
  { name: 'violet', light: '#7e22ce', dark: '#c084fc' },
] as const;
const DIRECTIONS = [
  { bit: N, name: 'north' },
  { bit: E, name: 'east' },
  { bit: S, name: 'south' },
  { bit: W, name: 'west' },
] as const;
type Phase = 'counting' | 'playing' | 'advancing' | 'finished';

function TrackGlyph({ ports, color }: { readonly ports: number; readonly color: string }) {
  const paths: string[] = [];
  if (ports & N) paths.push('M24 24 L24 2');
  if (ports & S) paths.push('M24 24 L24 46');
  if (ports & W) paths.push('M24 24 L2 24');
  if (ports & E) paths.push('M24 24 L46 24');
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
      {paths.map((d) => (
        <path key={d} d={d} stroke={color} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      <circle cx={24} cy={24} r={4} fill={color} />
    </svg>
  );
}

function EndpointGlyph({ station }: { readonly station: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      {station ? (
        <path d="M4 18V2h12l-3 4 3 4H4" />
      ) : (
        <>
          <rect x="4" y="2" width="12" height="13" rx="3" />
          <path d="M4 9h12M7 15l-2 3m8-3 2 3" />
          <path d="M7 12h1m4 0h1" strokeWidth={2.5} />
        </>
      )}
    </svg>
  );
}

export default function RailRouter({ onFinish }: GameProps) {
  const [phase, setPhase] = useState<Phase>('counting');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => makeLevel(1));
  const [feedback, setFeedback] = useState('Rotate a tile to connect each numbered train to its matching flag.');
  const { theme, reducedMotion } = useTheme();
  const systemReducedMotion = useReducedMotion();
  const reduceMotion = reducedMotion || systemReducedMotion;
  const phaseRef = useRef<Phase>('counting');
  const puzzleRef = useRef(puzzle);
  const scoreRef = useRef(0);
  const completedRef = useRef(0);

  const finish = useCallback(() => {
    if (phaseRef.current === 'finished') return;
    phaseRef.current = 'finished';
    setPhase('finished');
    onFinish({
      score: scoreRef.current,
      stats: [{ label: 'Levels solved', value: String(completedRef.current) }],
    });
  }, [onFinish]);

  const { remaining, reset, addTime, isExpired } = useCountdown({ seconds: TOTAL_TIME, autoStart: false, onExpire: finish });
  const start = useCallback(() => {
    if (phaseRef.current !== 'counting') return;
    phaseRef.current = 'playing';
    setPhase('playing');
    reset(TOTAL_TIME);
  }, [reset]);

  const flow = useMemo(() => solveFlow(puzzle), [puzzle]);

  // The transition owns its timeout; effect replay simply reschedules it.
  useEffect(() => {
    if (phase !== 'advancing') return;
    const timeout = window.setTimeout(() => {
      if (phaseRef.current !== 'advancing') return;
      const nextLevel = level + 1;
      const nextPuzzle = makeLevel(nextLevel);
      puzzleRef.current = nextPuzzle;
      setPuzzle(nextPuzzle);
      setLevel(nextLevel);
      setFeedback(`Level ${nextLevel}: connect all ${nextPuzzle.colors.length} numbered routes.`);
      phaseRef.current = 'playing';
      setPhase('playing');
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [level, phase]);

  const rotate = useCallback(
    (i: number) => {
      if (phaseRef.current !== 'playing' || isExpired()) return;
      const current = puzzleRef.current;
      const cell = current.cells[i];
      if (!cell || cell.fixed) return;
      const cells = current.cells.map((item, index) => (index === i ? { ...item, ports: rotateCW(item.ports) } : item));
      const next = { ...current, cells };
      const previousFlow = solveFlow(current);
      const nextFlow = solveFlow(next);
      puzzleRef.current = next;
      setPuzzle(next);

      if (current.colors.every((color) => nextFlow.solved.has(color))) {
        phaseRef.current = 'advancing';
        setPhase('advancing');
        const gained = 100 + current.colors.length * 50 + (level - 1) * 25 + Math.round(remaining) * 2;
        scoreRef.current += gained;
        completedRef.current++;
        setScore(scoreRef.current);
        addTime(8);
        setFeedback(`Level ${level} complete! +${gained} points · +8 seconds`);
        playSound('correct');
        return;
      }

      const connected = current.colors.filter((color) => nextFlow.solved.has(color) && !previousFlow.solved.has(color));
      const disconnected = current.colors.filter((color) => previousFlow.solved.has(color) && !nextFlow.solved.has(color));
      if (connected.length) {
        setFeedback(`Route ${connected.map((color) => color + 1).join(', ')} connected · ${nextFlow.solved.size}/${current.colors.length} ready`);
        playSound('correct');
      } else {
        if (disconnected.length) setFeedback(`Route ${disconnected.map((color) => color + 1).join(', ')} disconnected. Rotate to reconnect it.`);
        playSound('click');
      }
    },
    [addTime, isExpired, level, remaining],
  );

  const { cols } = puzzle;
  const colorFor = (color: number) => COLORS[color][theme];
  const idleColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const inputBlocked = phase !== 'playing' || remaining <= 0;

  return (
    <div className="relative flex min-w-0 flex-1 flex-col">
      {phase === 'counting' && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage hud={<HUD accent={accent} score={score} time={Math.ceil(remaining)} timeFraction={Math.min(1, remaining / TOTAL_TIME)} status={String(level)} statusLabel="Level" />}>
        <div className="mb-3 min-h-12 text-center text-sm font-bold text-slate-700 dark:text-slate-200" role="status" aria-live="polite" aria-atomic="true">
          {feedback}
        </div>
        <div
          className="grid w-full gap-0.5 rounded-2xl bg-white/60 p-1 shadow-sm ring-1 ring-slate-200 sm:gap-1.5 sm:p-2.5 dark:bg-white/5 dark:ring-white/10"
          role="group"
          aria-label={`Level ${level} rail board, ${cols} rows and columns`}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: cols * 72 }}
        >
          {puzzle.cells.map((cell, i) => {
            const lit = flow.cells[i].lit;
            const flowColor = lit !== null ? colorFor(lit) : idleColor;
            const directions = DIRECTIONS.filter((dir) => cell.ports & dir.bit)
              .map((dir) => dir.name)
              .join(', ');
            const position = `Row ${Math.floor(i / cols) + 1}, column ${(i % cols) + 1}`;
            if (cell.fixed) {
              const endpointColor = colorFor(cell.colorIdx);
              const done = flow.solved.has(cell.colorIdx);
              const endpointName = `${cell.kind === 'source' ? 'Train' : 'Station'} ${cell.colorIdx + 1}`;
              return (
                <div
                  key={i}
                  role="img"
                  aria-label={`${position}: ${endpointName}, ${COLORS[cell.colorIdx].name}, opens ${directions}${done ? ', connected' : ''}`}
                  className="relative flex aspect-square min-w-0 items-center justify-center rounded-lg sm:rounded-xl"
                  style={{ background: `${endpointColor}18`, boxShadow: done ? `inset 0 0 0 2px ${endpointColor}` : undefined }}
                >
                  <div className="absolute inset-0">
                    <TrackGlyph ports={cell.ports} color={endpointColor} />
                  </div>
                  <span className="relative z-10 flex items-center gap-0.5 rounded-md bg-white px-1 py-0.5 text-xs font-black dark:bg-slate-900" style={{ color: endpointColor }}>
                    <EndpointGlyph station={cell.kind === 'station'} />
                    {cell.colorIdx + 1}
                  </span>
                </div>
              );
            }
            return (
              <motion.button
                key={i}
                type="button"
                onClick={() => rotate(i)}
                disabled={inputBlocked}
                aria-label={`${position}: ${cell.kind} track, opens ${directions}${lit !== null ? `, train ${lit + 1}` : ''}. Rotate clockwise`}
                whileTap={reduceMotion || inputBlocked ? undefined : { scale: 0.96 }}
                className="ml-tap flex aspect-square min-w-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-default disabled:opacity-70 sm:rounded-xl dark:bg-white/10 dark:ring-white/10 dark:hover:bg-white/20"
              >
                <TrackGlyph ports={cell.ports} color={flowColor} />
              </motion.button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs font-bold" aria-label="Route status">
          {puzzle.colors.map((color) => (
            <span key={color} className="flex items-center gap-1 rounded-full px-2 py-1.5" style={{ background: `${colorFor(color)}18`, color: colorFor(color) }}>
              <span>Route {color + 1}</span>
              <span aria-label={flow.solved.has(color) ? 'connected' : 'not connected'}>{flow.solved.has(color) ? '✓' : '○'}</span>
            </span>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">Train → matching flag · Tap a track to turn it clockwise</p>
      </GameStage>
    </div>
  );
}
