import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { pick } from '../lib/utils';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { useCountdown } from '../hooks/useCountdown';
import { Flame } from '../components/GameGlyphs';

const accent = CATEGORIES.flexibility.accent;
const TOTAL_TIME = 45;

type Dir = 'left' | 'right' | 'up' | 'down';
const DIRS: Dir[] = ['left', 'right', 'up', 'down'];
const ROTATION: Record<Dir, number> = { right: 0, down: 90, left: 180, up: -90 };
const GLYPH: Record<Dir, string> = { left: '←', right: '→', up: '↑', down: '↓' };
const KEYMAP: Record<string, Dir> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

// Two modes decided by the leaf's color:
//  - ORANGE leaf → respond to the direction it MOVES across the screen.
//  - GREEN leaf  → respond to the direction it POINTS.
const ORANGE = '#f97316';
const GREEN = '#22c55e';

interface Round {
  points: Dir;
  moves: Dir;
  color: string; // ORANGE or GREEN
}

function makeRound(): Round {
  const color = Math.random() < 0.5 ? ORANGE : GREEN;
  const points = pick(DIRS);
  // 45% congruent (points === moves), else different.
  const moves = Math.random() < 0.45 ? points : pick(DIRS.filter((d) => d !== points));
  return { points, moves, color };
}

export default function EbbFlow({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [round, setRound] = useState<Round>(makeRound);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);

  const finished = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const bestRef = useRef(0);
  const roundRef = useRef(round);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { correctRef.current = correct; }, [correct]);
  useEffect(() => { bestRef.current = bestCombo; }, [bestCombo]);
  useEffect(() => { roundRef.current = round; }, [round]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish({
      score: scoreRef.current,
      stats: [
        { label: 'Correct', value: String(correctRef.current) },
        { label: 'Best streak', value: String(bestRef.current) },
      ],
    });
  }, [onFinish]);

  const timer = useCountdown({ seconds: TOTAL_TIME, autoStart: false, onExpire: finish });

  const start = useCallback(() => {
    setCounting(false);
    timer.reset(TOTAL_TIME);
  }, [timer]);

  const answer = useCallback(
    (dir: Dir) => {
      if (counting || finished.current) return;
      const r = roundRef.current;
      const target = r.color === ORANGE ? r.moves : r.points;
      if (dir === target) {
        setCombo((cb) => {
          const nc = cb + 1;
          setBestCombo((b) => Math.max(b, nc));
          setScore((s) => s + 15 + Math.min(45, nc * 2));
          return nc;
        });
        setCorrect((c) => c + 1);
        setFlash('ok');
        playSound('correct');
      } else {
        setCombo(0);
        setScore((s) => Math.max(0, s - 8));
        timer.addTime(-1);
        setFlash('bad');
        playSound('wrong');
      }
      setRound(makeRound());
      setIndex((i) => i + 1);
      window.setTimeout(() => setFlash(null), 150);
    },
    [counting, timer],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
  const multiplier = 1 + Math.floor(combo / 5);

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
            statusLabel="Combo"
            statusNode={
              multiplier > 1 ? (
                <span>x{multiplier}</span>
              ) : combo > 1 ? (
                <span className="flex items-center gap-1">
                  {combo}
                  <Flame className="h-4 w-4" color="#f97316" />
                </span>
              ) : undefined
            }
          />
        }
      >
        <div
          className="mb-4 rounded-2xl px-4 py-2 text-center text-sm font-extrabold text-white shadow-sm"
          style={{ background: isOrange ? ORANGE : GREEN }}
        >
          {isOrange ? 'ORANGE → where it MOVES' : 'GREEN → where it POINTS'}
        </div>

        <motion.div
          key={index}
          animate={flash === 'bad' ? { x: [0, -8, 8, 0] } : {}}
          transition={{ duration: 0.22 }}
          className="relative mb-8 flex items-center justify-center overflow-hidden rounded-3xl bg-white/70 shadow-sm ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10"
          style={{ width: 'min(86vw, 340px)', height: 220 }}
        >
          {/* The leaf continuously DRIFTS in the `moves` direction (so ORANGE
              mode is readable) while POINTING in the `points` direction. */}
          <motion.div
            key={`drift-${index}`}
            initial={{
              x: round.moves === 'left' ? 70 : round.moves === 'right' ? -70 : 0,
              y: round.moves === 'up' ? 70 : round.moves === 'down' ? -70 : 0,
            }}
            animate={{
              x: round.moves === 'left' ? -70 : round.moves === 'right' ? 70 : 0,
              y: round.moves === 'up' ? -70 : round.moves === 'down' ? 70 : 0,
            }}
            transition={{ duration: 1.6, ease: 'linear', repeat: Infinity, repeatType: 'reverse' }}
          >
            <motion.div
              animate={{ rotate: ROTATION[round.points] }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <svg width="104" height="72" viewBox="0 0 104 72" aria-hidden>
                {/* Clear arrow: tail bar + head triangle pointing right by default */}
                <g fill={round.color}>
                  <rect x="10" y="30" width="54" height="12" rx="6" />
                  <path d="M58 16 L96 36 L58 56 Z" />
                </g>
                {/* Subtle vein for a leafy feel without hurting direction clarity */}
                <path d="M14 36 H92" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </motion.div>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-3 gap-2" style={{ width: 'min(80vw, 300px)' }}>
          <div />
          <DirButton dir="up" onTap={answer} />
          <div />
          <DirButton dir="left" onTap={answer} />
          <DirButton dir="down" onTap={answer} />
          <DirButton dir="right" onTap={answer} />
        </div>
      </GameStage>
    </div>
  );
}

function DirButton({ dir, onTap }: { dir: Dir; onTap: (d: Dir) => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => onTap(dir)}
      className="ml-tap flex aspect-square items-center justify-center rounded-2xl bg-white/80 text-3xl font-black text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
    >
      {GLYPH[dir]}
    </motion.button>
  );
}
