import { motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { useCountdown } from '../hooks/useCountdown';
import { CATEGORIES } from '../lib/categories';
import { playSound } from '../lib/sound';
import type { GameProps } from '../lib/types';
import { FLASH_COLORS, getFlashMatchDifficulty, getReactionLevel, getReactionProgress, makeFlashSymbol, nextFlashSymbol } from './reaction-progression';
import type { FlashSymbol as Sym } from './reaction-progression';

const accent = CATEGORIES.speed.accent;
const TOTAL_TIME = 45;

const COLOR_NAMES = ['red', 'blue', 'green', 'yellow', 'purple', 'pink'];

function ShapeGlyph({ shape, color, size = 120 }: { readonly shape: Sym['shape']; readonly color: string; readonly size?: number }) {
  const common = { fill: color } as const;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      {shape === 'square' && <rect x="18" y="18" width="64" height="64" rx="10" {...common} />}
      {shape === 'circle' && <circle cx="50" cy="50" r="34" {...common} />}
      {shape === 'triangle' && <polygon points="50,14 86,84 14,84" {...common} />}
      {shape === 'diamond' && <polygon points="50,12 88,50 50,88 12,50" {...common} />}
      {shape === 'star' && <polygon points="50,10 61,38 92,38 67,57 76,86 50,68 24,86 33,57 8,38 39,38" {...common} />}
    </svg>
  );
}

export default function FlashMatch({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [prev, setPrev] = useState<Sym | null>(null);
  const [current, setCurrent] = useState<Sym>(() => makeFlashSymbol());
  const [completed, setCompleted] = useState(0);
  const difficulty = getFlashMatchDifficulty(completed);
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
  const seedStarted = useRef(false);
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
  }, []);

  const answer = useCallback(
    (saidMatch: boolean) => {
      if (counting || finished.current || locked.current || prev === null || !running || isExpired()) return;
      locked.current = true;
      const isMatch = current.shape === prev.shape && current.color === prev.color;
      const right = saidMatch === isMatch;

      if (right) {
        correctRef.current += 1;
        const nc = combo + 1;
        setCombo(nc);
        bestRef.current = Math.max(bestRef.current, nc);
        scoreRef.current += difficulty.reward + Math.min(60, nc * 3);
        setScore(scoreRef.current);
        setFlash('ok');
        playSound('correct');
      } else {
        setCombo(0);
        scoreRef.current = Math.max(0, scoreRef.current - 15);
        setScore(scoreRef.current);
        addTime(-1.5);
        setFlash('bad');
        playSound('wrong');
      }

      nextRound.current = window.setTimeout(() => {
        if (finished.current) return;
        setPrev(current);
        setCurrent(nextFlashSymbol(current, correctRef.current));
        setCompleted(correctRef.current);
        setFlash(null);
      }, right ? 250 : 800);
    },
    [counting, prev, current, running, isExpired, addTime, combo, difficulty.reward],
  );

  const firstMove = prev === null;

  const begin = () => {
    if (counting || finished.current || seedStarted.current) return;
    seedStarted.current = true;
    setPrev(current);
    setCurrent(nextFlashSymbol(current, 0));
    reset(TOTAL_TIME);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const key = event.key.toLowerCase();
      if (!['arrowleft', 'arrowright', 'n', 'y'].includes(key)) return;
      event.preventDefault();
      answer(key === 'arrowright' || key === 'y');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer]);

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage hud={<HUD accent={accent} score={score} time={remaining} timeFraction={remaining / TOTAL_TIME} statusLabel="Streak" status={String(combo)} />}>
        <div className="flex w-full flex-col items-center" style={{ maxWidth: 420 }}>
          <p className="mb-2 text-center text-sm font-bold text-slate-600 dark:text-slate-300">{getReactionProgress(completed)}</p>
          <p className="mb-4 text-center text-sm font-bold text-slate-600 dark:text-slate-300">
            {firstMove ? 'Remember this first symbol. The clock starts when you’re ready.' : 'Same shape AND color as the previous symbol?'}
          </p>

          <div className="relative mb-8 flex h-56 w-full items-center justify-center">
            <motion.div
              initial={false}
              role="img"
              aria-label={`${COLOR_NAMES[FLASH_COLORS.findIndex((color) => color === current.color)]} ${current.shape}`}
              className="flex h-48 w-48 items-center justify-center rounded-3xl bg-white/80 shadow-sm ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10"
              style={{
                boxShadow: flash === 'ok' ? `0 0 0 4px ${accent}55` : flash === 'bad' ? '0 0 0 4px #ef444455' : undefined,
              }}
            >
              <ShapeGlyph shape={current.shape} color={current.color} />
            </motion.div>
          </div>
          {firstMove ? (
            <button
              onClick={begin}
              onKeyDown={(event) => {
                if (event.repeat) event.preventDefault();
              }}
              disabled={counting}
              className="ml-tap rounded-2xl px-6 py-3 text-base font-bold text-white shadow-lg"
              style={{ background: accent }}
            >
              Memorized — show next →
            </button>
          ) : (
            <>
              <p role="status" className="mb-3 min-h-6 text-center text-sm font-bold text-slate-600 dark:text-slate-300">
                {flash === 'ok'
                  ? 'Correct!'
                  : flash === 'bad'
                    ? `${current.shape === prev.shape && current.color === prev.color ? 'They match' : 'Different symbol'} · −15 points, −1.5s`
                    : 'Compare with the last symbol you saw'}
              </p>
              <div className="grid w-full grid-cols-2 gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => answer(false)}
                  onKeyDown={(event) => {
                    if (event.repeat) event.preventDefault();
                  }}
                  disabled={counting || flash !== null || !running}
                  className="ml-tap rounded-2xl bg-white/80 py-5 text-xl font-extrabold text-slate-600 shadow-sm ring-1 ring-slate-200 disabled:opacity-40 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
                >
                  NO <span className="block text-xs font-semibold">← / N</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => answer(true)}
                  onKeyDown={(event) => {
                    if (event.repeat) event.preventDefault();
                  }}
                  disabled={counting || flash !== null || !running}
                  className="ml-tap rounded-2xl py-5 text-xl font-extrabold text-white shadow-lg disabled:opacity-40"
                  style={{ background: accent }}
                >
                  YES <span className="block text-xs font-semibold">→ / Y</span>
                </motion.button>
              </div>
            </>
          )}
        </div>
      </GameStage>
    </div>
  );
}
