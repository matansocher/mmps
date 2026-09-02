import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { pick } from '../lib/utils';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { useCountdown } from '../hooks/useCountdown';

const accent = CATEGORIES.speed.accent;
const TOTAL_TIME = 45;

interface Sym {
  shape: 'square' | 'circle' | 'triangle' | 'diamond' | 'star';
  color: string;
}

const SHAPES: Sym['shape'][] = ['square', 'circle', 'triangle', 'diamond', 'star'];
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'];

function makeSymbol(): Sym {
  return { shape: pick(SHAPES), color: pick(COLORS) };
}

/** Produce the next symbol so ~45% of the time it matches `prev`. */
function nextSymbol(prev: Sym): Sym {
  if (Math.random() < 0.45) return { ...prev };
  let s = makeSymbol();
  // Guarantee it's actually different.
  while (s.shape === prev.shape && s.color === prev.color) s = makeSymbol();
  return s;
}

function ShapeGlyph({ shape, color, size = 120 }: { shape: Sym['shape']; color: string; size?: number }) {
  const common = { fill: color } as const;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      {shape === 'square' && <rect x="18" y="18" width="64" height="64" rx="10" {...common} />}
      {shape === 'circle' && <circle cx="50" cy="50" r="34" {...common} />}
      {shape === 'triangle' && <polygon points="50,14 86,84 14,84" {...common} />}
      {shape === 'diamond' && <polygon points="50,12 88,50 50,88 12,50" {...common} />}
      {shape === 'star' && (
        <polygon
          points="50,10 61,38 92,38 67,57 76,86 50,68 24,86 33,57 8,38 39,38"
          {...common}
        />
      )}
    </svg>
  );
}

export default function FlashMatch({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [prev, setPrev] = useState<Sym | null>(null);
  const [current, setCurrent] = useState<Sym>(makeSymbol);
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
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { correctRef.current = correct; }, [correct]);
  useEffect(() => { bestRef.current = bestCombo; }, [bestCombo]);

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

  const answer = (saidMatch: boolean) => {
    if (counting || finished.current || prev === null) return;
    const isMatch = current.shape === prev.shape && current.color === prev.color;
    const right = saidMatch === isMatch;

    if (right) {
      setCorrect((c) => c + 1);
      setCombo((cb) => {
        const nc = cb + 1;
        setBestCombo((b) => Math.max(b, nc));
        setScore((s) => s + 20 + Math.min(60, nc * 3));
        return nc;
      });
      setFlash('ok');
      playSound('correct');
    } else {
      setCombo(0);
      setScore((s) => Math.max(0, s - 15));
      timer.addTime(-1.5);
      setFlash('bad');
      playSound('wrong');
    }

    setPrev(current);
    setCurrent((c) => nextSymbol(c));
    setIndex((i) => i + 1);
    window.setTimeout(() => setFlash(null), 160);
  };

  // On the very first symbol there is no previous — reveal a second symbol
  // automatically so the player always compares against something.
  const firstMove = prev === null;

  const begin = () => {
    if (firstMove) {
      setPrev(current);
      setCurrent((c) => nextSymbol(c));
      setIndex((i) => i + 1);
    }
  };

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
            status={combo > 1 ? `x${combo}` : undefined}
          />
        }
      >
        <div className="flex w-full flex-col items-center" style={{ maxWidth: 420 }}>
          <p className="mb-4 text-center text-sm font-bold text-slate-400 dark:text-slate-500">
            Does this symbol match the previous one?
          </p>

          <div className="relative mb-8 flex h-56 w-full items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.7, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.15 }}
                transition={{ duration: 0.16 }}
                className="flex h-48 w-48 items-center justify-center rounded-3xl bg-white/80 shadow-sm ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10"
                style={{
                  boxShadow:
                    flash === 'ok'
                      ? `0 0 0 4px ${accent}55`
                      : flash === 'bad'
                        ? '0 0 0 4px #ef444455'
                        : undefined,
                }}
              >
                <ShapeGlyph shape={current.shape} color={current.color} />
              </motion.div>
            </AnimatePresence>

            {firstMove && (
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/60 backdrop-blur-sm dark:bg-slate-950/50">
                <button
                  onClick={begin}
                  className="ml-tap rounded-2xl px-6 py-3 text-base font-bold text-white shadow-lg"
                  style={{ background: accent }}
                >
                  Show first symbol →
                </button>
              </div>
            )}
          </div>

          <div className="grid w-full grid-cols-2 gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => answer(false)}
              disabled={firstMove}
              className="ml-tap rounded-2xl bg-white/80 py-5 text-xl font-extrabold text-slate-600 shadow-sm ring-1 ring-slate-200 disabled:opacity-40 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
            >
              NO
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => answer(true)}
              disabled={firstMove}
              className="ml-tap rounded-2xl py-5 text-xl font-extrabold text-white shadow-lg disabled:opacity-40"
              style={{ background: accent }}
            >
              YES
            </motion.button>
          </div>
        </div>
      </GameStage>
    </div>
  );
}
