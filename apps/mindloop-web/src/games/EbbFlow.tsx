import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { useCountdown } from '../hooks/useCountdown';
import { useTheme } from '../hooks/useTheme';
import { CATEGORIES } from '../lib/categories';
import { playSound } from '../lib/sound';
import type { GameProps } from '../lib/types';
import { EBB_GREEN as GREEN, EBB_ORANGE as ORANGE, getEbbFlowDifficulty, getEbbTarget, getReactionLevel, getReactionProgress, makeEbbRound } from './reaction-progression';
import type { EbbDirection as Dir, EbbRound } from './reaction-progression';

const accent = CATEGORIES.flexibility.accent;
const TOTAL_TIME = 45;

const ROTATION: Record<Dir, number> = { right: 0, down: 90, left: 180, up: -90 };
const GLYPH: Record<Dir, string> = { left: '←', right: '→', up: '↑', down: '↓' };
const KEYMAP: Record<string, Dir> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

export default function EbbFlow({ onFinish }: GameProps) {
  const prefersReducedMotion = useReducedMotion();
  const { reducedMotion: settingsReducedMotion, theme } = useTheme();
  const reducedMotion = prefersReducedMotion || settingsReducedMotion;
  const [counting, setCounting] = useState(true);
  const [round, setRound] = useState<EbbRound>(() => makeEbbRound(0));
  const [completed, setCompleted] = useState(0);
  const difficulty = getEbbFlowDifficulty(completed);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);

  const finished = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const bestRef = useRef(0);
  const locked = useRef(false);
  useLayoutEffect(() => {
    locked.current = flash !== null;
  }, [flash]);
  const nextRound = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(nextRound.current), []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish({
      score: scoreRef.current,
      stats: [
        { label: 'Correct', value: String(correctRef.current) },
        { label: 'Best streak', value: String(bestRef.current) },
        { label: 'Level reached', value: String(getReactionLevel(correctRef.current)) },
      ],
    });
  }, [onFinish]);

  const { remaining, running, reset, addTime, isExpired } = useCountdown({ seconds: TOTAL_TIME, autoStart: false, onExpire: finish });

  const start = useCallback(() => {
    setCounting(false);
    reset(TOTAL_TIME);
  }, [reset]);

  const answer = useCallback(
    (dir: Dir) => {
      if (counting || finished.current || locked.current || !running || isExpired()) return;
      locked.current = true;
      const target = getEbbTarget(round);
      if (dir === target) {
        const nc = combo + 1;
        setCombo(nc);
        bestRef.current = Math.max(bestRef.current, nc);
        scoreRef.current += difficulty.reward + Math.min(45, nc * 2);
        setScore(scoreRef.current);
        correctRef.current += 1;
        setFlash('ok');
        playSound('correct');
      } else {
        setCombo(0);
        scoreRef.current = Math.max(0, scoreRef.current - 8);
        setScore(scoreRef.current);
        addTime(-1);
        setFlash('bad');
        playSound('wrong');
      }
      nextRound.current = window.setTimeout(() => {
        if (finished.current) return;
        setRound(makeEbbRound(correctRef.current, round));
        setCompleted(correctRef.current);
        setIndex((i) => i + 1);
        setFlash(null);
      }, dir === target ? 250 : 800);
    },
    [counting, running, isExpired, addTime, round, combo, difficulty.reward],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const dir = KEYMAP[e.key];
      if (dir) {
        e.preventDefault();
        answer(dir);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer]);

  const isOrange = round.color === ORANGE;

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage hud={<HUD accent={accent} score={score} time={remaining} timeFraction={remaining / TOTAL_TIME} statusLabel="Streak" status={String(combo)} />}>
        <p className="mb-2 text-center text-sm font-bold text-slate-600 dark:text-slate-300">{getReactionProgress(completed)}</p>
        <div className="mb-4 rounded-2xl px-4 py-2 text-center text-sm font-extrabold text-slate-950 shadow-sm" style={{ background: isOrange ? ORANGE : GREEN }}>
          {isOrange ? 'ORANGE → where it MOVES' : 'GREEN → where it POINTS'}
        </div>

        <motion.div
          key={index}
          animate={!reducedMotion && flash === 'bad' ? { x: [0, -8, 8, 0] } : {}}
          transition={{ duration: 0.22 }}
          className="relative mb-8 flex items-center justify-center overflow-hidden rounded-3xl bg-white/70 shadow-sm ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10"
          style={{ width: 'min(86vw, 340px)', height: 220 }}
          role="img"
          aria-label={`Arrow points ${round.points} and moves ${round.moves}`}
        >
          {/* The leaf continuously DRIFTS in the `moves` direction (so ORANGE
              mode is readable) while POINTING in the `points` direction. */}
          <motion.div
            key={`drift-${index}`}
            initial={
              reducedMotion
                ? false
                : {
                    x: round.moves === 'left' ? 70 : round.moves === 'right' ? -70 : 0,
                    y: round.moves === 'up' ? 70 : round.moves === 'down' ? -70 : 0,
                  }
            }
            animate={
              reducedMotion
                ? { x: 0, y: 0 }
                : {
                    x: round.moves === 'left' ? -70 : round.moves === 'right' ? 70 : 0,
                    y: round.moves === 'up' ? -70 : round.moves === 'down' ? 70 : 0,
                  }
            }
            transition={{ duration: 1.6, ease: 'linear', repeat: Infinity, repeatType: 'loop' }}
          >
            <motion.div style={{ rotate: ROTATION[round.points] }}>
              <svg width="104" height="72" viewBox="0 0 104 72" aria-hidden>
                {/* Clear arrow: tail bar + head triangle pointing right by default */}
                <g fill={theme === 'dark' ? round.color : isOrange ? '#c2410c' : '#15803d'}>
                  <rect x="10" y="30" width="54" height="12" rx="6" />
                  <path d="M58 16 L96 36 L58 56 Z" />
                </g>
                {/* Subtle vein for a leafy feel without hurting direction clarity */}
                <path d="M14 36 H92" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </motion.div>
          </motion.div>
          {reducedMotion && (
            <span className="absolute bottom-3 rounded-lg bg-white/90 px-3 py-1 text-sm font-bold text-slate-800 dark:bg-slate-900 dark:text-slate-100">Moves {GLYPH[round.moves]}</span>
          )}
        </motion.div>

        <p role="status" className="mb-3 min-h-6 text-center text-sm font-bold text-slate-600 dark:text-slate-300">
          {flash === 'ok'
            ? 'Correct!'
            : flash === 'bad'
              ? `${isOrange ? 'Moves' : 'Points'} ${GLYPH[isOrange ? round.moves : round.points]} · −8 points, −1s`
              : 'Tap a direction or use the arrow keys'}
        </p>
        <div className="grid grid-cols-3 gap-2" style={{ width: 'min(80vw, 300px)' }}>
          <div />
          <DirButton dir="up" onTap={answer} disabled={counting || flash !== null || !running} />
          <div />
          <DirButton dir="left" onTap={answer} disabled={counting || flash !== null || !running} />
          <DirButton dir="down" onTap={answer} disabled={counting || flash !== null || !running} />
          <DirButton dir="right" onTap={answer} disabled={counting || flash !== null || !running} />
        </div>
      </GameStage>
    </div>
  );
}

function DirButton({ dir, onTap, disabled }: { readonly dir: Dir; readonly onTap: (d: Dir) => void; readonly disabled: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => onTap(dir)}
      onKeyDown={(event) => {
        if (event.repeat) event.preventDefault();
      }}
      disabled={disabled}
      aria-label={dir}
      className="ml-tap flex aspect-square items-center justify-center rounded-2xl bg-white/80 text-3xl font-black text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
    >
      {GLYPH[dir]}
    </motion.button>
  );
}
